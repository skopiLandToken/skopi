-- DB-driven verifier rules for airdrop tasks

alter table public.airdrop_tasks
  add column if not exists allowed_domains text[],
  add column if not exists requires_https boolean not null default true,
  add column if not exists min_evidence_length integer not null default 10;

-- Optional sanity constraint
alter table public.airdrop_tasks
  drop constraint if exists airdrop_tasks_min_evidence_length_check;

alter table public.airdrop_tasks
  add constraint airdrop_tasks_min_evidence_length_check
  check (min_evidence_length >= 0 and min_evidence_length <= 2048);
