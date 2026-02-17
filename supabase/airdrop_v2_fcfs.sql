-- FCFS airdrop cap enforcement (run after airdrop_v2_schema.sql)

alter table public.airdrop_campaigns
add column if not exists distributed_tokens numeric(20,6) not null default 0;

create or replace function public.airdrop_claim_fcfs(
  p_campaign_id uuid,
  p_wallet text,
  p_amount numeric,
  p_user_id uuid default null
)
returns table (
  ok boolean,
  error text,
  allocation_id uuid,
  remaining_tokens numeric
)
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
  if p_amount is null or p_amount <= 0 then
    return query select false, 'invalid_amount', null::uuid, null::numeric;
    return;
  end if;

  if p_wallet is null or length(trim(p_wallet)) < 20 then
    return query select false, 'invalid_wallet', null::uuid, null::numeric;
    return;
  end if;

  -- lock campaign row for atomic FCFS updates
  select * into v_campaign
  from public.airdrop_campaigns
  where id = p_campaign_id
  for update;

  if not found then
    return query select false, 'campaign_not_found', null::uuid, null::numeric;
    return;
  end if;

  if v_campaign.status <> 'active' then
    return query select false, 'campaign_not_active', null::uuid, null::numeric;
    return;
  end if;

  if v_campaign.start_at is not null and v_now < v_campaign.start_at then
    return query select false, 'campaign_not_started', null::uuid, null::numeric;
    return;
  end if;

  if v_campaign.end_at is not null and v_now > v_campaign.end_at then
    return query select false, 'campaign_ended', null::uuid, null::numeric;
    return;
  end if;

  -- one allocation row per wallet per campaign
  select id into v_existing
  from public.airdrop_allocations
  where campaign_id = p_campaign_id and wallet_address = p_wallet
  limit 1;

  if v_existing is not null then
    return query select false, 'already_claimed', v_existing, greatest(coalesce(v_campaign.pool_tokens,0) - coalesce(v_campaign.distributed_tokens,0),0);
    return;
  end if;

  if v_campaign.per_user_cap is not null and p_amount > v_campaign.per_user_cap then
    return query select false, 'over_user_cap', null::uuid, greatest(coalesce(v_campaign.pool_tokens,0) - coalesce(v_campaign.distributed_tokens,0),0);
    return;
  end if;

  if v_campaign.pool_tokens is null then
    return query select false, 'pool_not_set', null::uuid, null::numeric;
    return;
  end if;

  v_remaining := coalesce(v_campaign.pool_tokens, 0) - coalesce(v_campaign.distributed_tokens, 0);

  if v_remaining < p_amount then
    return query select false, 'insufficient_pool', null::uuid, greatest(v_remaining,0);
    return;
  end if;

  v_lock_end := v_now + make_interval(days => coalesce(v_campaign.lock_days,90));

  insert into public.airdrop_allocations (
    campaign_id,
    user_id,
    wallet_address,
    total_tokens,
    locked_tokens,
    claimable_tokens,
    lock_end_at,
    status
  ) values (
    p_campaign_id,
    p_user_id,
    p_wallet,
    p_amount,
    p_amount,
    0,
    v_lock_end,
    'locked'
  ) returning id into v_allocation_id;

  update public.airdrop_campaigns
  set distributed_tokens = coalesce(distributed_tokens,0) + p_amount
  where id = p_campaign_id;

  return query select true, null::text, v_allocation_id, greatest(v_remaining - p_amount,0);
end;
$$;
