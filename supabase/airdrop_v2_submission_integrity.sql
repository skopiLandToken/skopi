-- Airdrop submission integrity + idempotency

alter table public.airdrop_submissions
  add column if not exists client_submission_id text,
  add column if not exists state_updated_at timestamptz not null default now(),
  add column if not exists state_version integer not null default 0;

-- Prevent duplicate processing for the same client submission intent
create unique index if not exists uq_airdrop_submission_client_intent
  on public.airdrop_submissions (campaign_id, task_id, wallet_address, client_submission_id)
  where client_submission_id is not null;

-- Keep state transitions strict
create or replace function public.airdrop_validate_submission_state_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.state is null then
      new.state := 'pending_review';
    end if;
    new.state_updated_at := now();
    new.state_version := 0;
    return new;
  end if;

  if new.state is distinct from old.state then
    if old.state = 'submitted' and new.state in ('pending_review','verified_auto','verified_manual','recheck_failed','revoked') then
      null;
    elsif old.state = 'pending_review' and new.state in ('verified_manual','revoked','recheck_failed') then
      null;
    elsif old.state = 'recheck_failed' and new.state in ('pending_review','revoked') then
      null;
    elsif old.state in ('verified_auto','verified_manual') and new.state = 'finalized' then
      null;
    elsif old.state = new.state then
      null;
    else
      raise exception 'invalid_submission_state_transition: % -> %', old.state, new.state;
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
