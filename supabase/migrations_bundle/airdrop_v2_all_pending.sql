-- SKOpi Airdrop V2 consolidated migration bundle
-- Safe to run multiple times (idempotent where possible)

-- 1) Base schema (tables/indexes/triggers)
-- NOTE: Keep this first for new environments
\echo 'Applying airdrop_v2_schema.sql equivalents...'

create extension if not exists pgcrypto;

create table if not exists public.airdrop_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','active','paused','finalized','archived')),
  start_at timestamptz,
  end_at timestamptz,
  lock_days integer not null default 90 check (lock_days >= 0),
  pool_tokens numeric(20,6),
  per_user_cap numeric(20,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.airdrop_tasks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.airdrop_campaigns(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  bounty_tokens numeric(20,6) not null default 0,
  requires_manual boolean not null default false,
  max_per_user integer,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, code)
);

create table if not exists public.airdrop_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.airdrop_campaigns(id) on delete cascade,
  task_id uuid not null references public.airdrop_tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  wallet_address text,
  handle text,
  evidence_url text,
  state text not null default 'submitted' check (state in ('submitted','pending_review','verified_auto','verified_manual','recheck_failed','revoked','finalized')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer text,
  notes text
);

create table if not exists public.airdrop_allocations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.airdrop_campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  wallet_address text not null,
  total_tokens numeric(20,6) not null default 0,
  locked_tokens numeric(20,6) not null default 0,
  claimable_tokens numeric(20,6) not null default 0,
  lock_end_at timestamptz,
  status text not null default 'locked' check (status in ('locked','claimable','claimed','revoked')),
  tx_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, wallet_address)
);

create index if not exists idx_airdrop_campaigns_status on public.airdrop_campaigns(status);
create index if not exists idx_airdrop_tasks_campaign on public.airdrop_tasks(campaign_id);
create index if not exists idx_airdrop_submissions_campaign on public.airdrop_submissions(campaign_id);
create index if not exists idx_airdrop_submissions_state on public.airdrop_submissions(state);
create index if not exists idx_airdrop_allocations_campaign on public.airdrop_allocations(campaign_id);
create index if not exists idx_airdrop_allocations_wallet on public.airdrop_allocations(wallet_address);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_airdrop_campaigns_updated_at on public.airdrop_campaigns;
create trigger trg_airdrop_campaigns_updated_at
before update on public.airdrop_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists trg_airdrop_tasks_updated_at on public.airdrop_tasks;
create trigger trg_airdrop_tasks_updated_at
before update on public.airdrop_tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_airdrop_allocations_updated_at on public.airdrop_allocations;
create trigger trg_airdrop_allocations_updated_at
before update on public.airdrop_allocations
for each row execute function public.set_updated_at();

-- 2) FCFS campaign distribution tracking
\echo 'Applying FCFS campaign tracking...'
alter table public.airdrop_campaigns
add column if not exists distributed_tokens numeric(20,6) not null default 0;

-- 3) FCFS claim function (single claim mode; retained for compatibility)
create or replace function public.airdrop_claim_fcfs(
  p_campaign_id uuid,
  p_wallet text,
  p_amount numeric,
  p_user_id uuid default null
)
returns table (ok boolean, error text, allocation_id uuid, remaining_tokens numeric)
language plpgsql
as $$
declare
  v_campaign public.airdrop_campaigns%rowtype;
  v_now timestamptz := now();
  v_remaining numeric;
  v_existing uuid;
  v_lock_end timestamptz;
  v_allocation_id uuid;
begin
  if p_amount is null or p_amount <= 0 then return query select false, 'invalid_amount', null::uuid, null::numeric; return; end if;
  if p_wallet is null or length(trim(p_wallet)) < 20 then return query select false, 'invalid_wallet', null::uuid, null::numeric; return; end if;

  select * into v_campaign from public.airdrop_campaigns where id = p_campaign_id for update;
  if not found then return query select false, 'campaign_not_found', null::uuid, null::numeric; return; end if;
  if v_campaign.status <> 'active' then return query select false, 'campaign_not_active', null::uuid, null::numeric; return; end if;
  if v_campaign.start_at is not null and v_now < v_campaign.start_at then return query select false, 'campaign_not_started', null::uuid, null::numeric; return; end if;
  if v_campaign.end_at is not null and v_now > v_campaign.end_at then return query select false, 'campaign_ended', null::uuid, null::numeric; return; end if;

  select id into v_existing from public.airdrop_allocations where campaign_id = p_campaign_id and wallet_address = p_wallet limit 1;
  if v_existing is not null then
    return query select false, 'already_claimed', v_existing, greatest(coalesce(v_campaign.pool_tokens,0) - coalesce(v_campaign.distributed_tokens,0),0);
    return;
  end if;

  if v_campaign.per_user_cap is not null and p_amount > v_campaign.per_user_cap then
    return query select false, 'over_user_cap', null::uuid, greatest(coalesce(v_campaign.pool_tokens,0) - coalesce(v_campaign.distributed_tokens,0),0);
    return;
  end if;

  if v_campaign.pool_tokens is null then return query select false, 'pool_not_set', null::uuid, null::numeric; return; end if;

  v_remaining := coalesce(v_campaign.pool_tokens, 0) - coalesce(v_campaign.distributed_tokens, 0);
  if v_remaining < p_amount then return query select false, 'insufficient_pool', null::uuid, greatest(v_remaining,0); return; end if;

  v_lock_end := v_now + make_interval(days => coalesce(v_campaign.lock_days,90));

  insert into public.airdrop_allocations (campaign_id,user_id,wallet_address,total_tokens,locked_tokens,claimable_tokens,lock_end_at,status)
  values (p_campaign_id,p_user_id,p_wallet,p_amount,p_amount,0,v_lock_end,'locked')
  returning id into v_allocation_id;

  update public.airdrop_campaigns set distributed_tokens = coalesce(distributed_tokens,0) + p_amount where id = p_campaign_id;

  return query select true, null::text, v_allocation_id, greatest(v_remaining - p_amount,0);
end;
$$;

-- 4) Task allocation FCFS (multi-allocation per wallet with per-user campaign cap)
\echo 'Applying task FCFS allocation function...'
create or replace function public.airdrop_allocate_task_fcfs(
  p_campaign_id uuid,
  p_wallet text,
  p_amount numeric,
  p_user_id uuid default null
)
returns table (ok boolean, error text, allocation_id uuid, remaining_tokens numeric)
language plpgsql
as $$
declare
  v_campaign public.airdrop_campaigns%rowtype;
  v_now timestamptz := now();
  v_remaining numeric;
  v_wallet_total numeric := 0;
  v_lock_end timestamptz;
  v_allocation_id uuid;
begin
  if p_amount is null or p_amount <= 0 then return query select false, 'invalid_amount', null::uuid, null::numeric; return; end if;
  if p_wallet is null or length(trim(p_wallet)) < 20 then return query select false, 'invalid_wallet', null::uuid, null::numeric; return; end if;

  select * into v_campaign from public.airdrop_campaigns where id = p_campaign_id for update;
  if not found then return query select false, 'campaign_not_found', null::uuid, null::numeric; return; end if;
  if v_campaign.status <> 'active' then return query select false, 'campaign_not_active', null::uuid, null::numeric; return; end if;
  if v_campaign.start_at is not null and v_now < v_campaign.start_at then return query select false, 'campaign_not_started', null::uuid, null::numeric; return; end if;
  if v_campaign.end_at is not null and v_now > v_campaign.end_at then return query select false, 'campaign_ended', null::uuid, null::numeric; return; end if;
  if v_campaign.pool_tokens is null then return query select false, 'pool_not_set', null::uuid, null::numeric; return; end if;

  select coalesce(sum(total_tokens), 0) into v_wallet_total
  from public.airdrop_allocations where campaign_id = p_campaign_id and wallet_address = p_wallet;

  if v_campaign.per_user_cap is not null and (v_wallet_total + p_amount) > v_campaign.per_user_cap then
    return query select false, 'over_user_cap', null::uuid, greatest(coalesce(v_campaign.pool_tokens,0) - coalesce(v_campaign.distributed_tokens,0),0);
    return;
  end if;

  v_remaining := coalesce(v_campaign.pool_tokens, 0) - coalesce(v_campaign.distributed_tokens, 0);
  if v_remaining < p_amount then return query select false, 'insufficient_pool', null::uuid, greatest(v_remaining,0); return; end if;

  v_lock_end := v_now + make_interval(days => coalesce(v_campaign.lock_days,90));

  insert into public.airdrop_allocations (campaign_id,user_id,wallet_address,total_tokens,locked_tokens,claimable_tokens,lock_end_at,status)
  values (p_campaign_id,p_user_id,p_wallet,p_amount,p_amount,0,v_lock_end,'locked')
  returning id into v_allocation_id;

  update public.airdrop_campaigns set distributed_tokens = coalesce(distributed_tokens,0) + p_amount where id = p_campaign_id;

  return query select true, null::text, v_allocation_id, greatest(v_remaining - p_amount,0);
end;
$$;

-- 5) Submission integrity + idempotency
\echo 'Applying submission integrity + idempotency...'
alter table public.airdrop_submissions
  add column if not exists client_submission_id text,
  add column if not exists state_updated_at timestamptz not null default now(),
  add column if not exists state_version integer not null default 0;

create unique index if not exists uq_airdrop_submission_client_intent
  on public.airdrop_submissions (campaign_id, task_id, wallet_address, client_submission_id)
  where client_submission_id is not null;

create or replace function public.airdrop_validate_submission_state_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.state is null then new.state := 'pending_review'; end if;
    new.state_updated_at := now();
    new.state_version := 0;
    return new;
  end if;

  if new.state is distinct from old.state then
    if old.state = 'submitted' and new.state in ('pending_review','verified_auto','verified_manual','recheck_failed','revoked') then null;
    elsif old.state = 'pending_review' and new.state in ('verified_manual','revoked','recheck_failed') then null;
    elsif old.state = 'recheck_failed' and new.state in ('pending_review','revoked') then null;
    elsif old.state in ('verified_auto','verified_manual') and new.state = 'finalized' then null;
    elsif old.state = new.state then null;
    else raise exception 'invalid_submission_state_transition: % -> %', old.state, new.state;
    end if;

    new.state_updated_at := now();
    new.state_version := coalesce(old.state_version, 0) + 1;
  else
    new.state_updated_at := coalesce(old.state_updated_at, now());
    new.state_version := coalesce(old.state_version, 0);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_airdrop_submission_state_guard on public.airdrop_submissions;
create trigger trg_airdrop_submission_state_guard
before insert or update on public.airdrop_submissions
for each row execute function public.airdrop_validate_submission_state_transition();

-- 6) Task-level verifier rules
\echo 'Applying task-level verifier rule columns...'
alter table public.airdrop_tasks
  add column if not exists allowed_domains text[],
  add column if not exists requires_https boolean not null default true,
  add column if not exists min_evidence_length integer not null default 10;

alter table public.airdrop_tasks
  drop constraint if exists airdrop_tasks_min_evidence_length_check;

alter table public.airdrop_tasks
  add constraint airdrop_tasks_min_evidence_length_check
  check (min_evidence_length >= 0 and min_evidence_length <= 2048);

\echo 'Airdrop V2 migration bundle complete.'
