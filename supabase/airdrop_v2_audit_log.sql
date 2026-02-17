-- Airdrop audit log for admin traceability

create table if not exists public.airdrop_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor text,
  campaign_id uuid,
  task_id uuid,
  submission_id uuid,
  allocation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_airdrop_audit_log_created_at on public.airdrop_audit_log(created_at desc);
create index if not exists idx_airdrop_audit_log_action on public.airdrop_audit_log(action);
create index if not exists idx_airdrop_audit_log_campaign on public.airdrop_audit_log(campaign_id);
