-- SKOpi V2 Airdrop Schema (draft v1)

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

-- Reuse set_updated_at trigger function if present
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
