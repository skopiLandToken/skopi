-- Enable RLS on all airdrop tables
alter table public.airdrop_campaigns enable row level security;
alter table public.airdrop_tasks enable row level security;
alter table public.airdrop_submissions enable row level security;
alter table public.airdrop_allocations enable row level security;
alter table public.airdrop_audit_log enable row level security;

-- airdrop_campaigns: anyone can read active campaigns
create policy "public can read active campaigns"
on public.airdrop_campaigns for select
to anon, authenticated
using (status = 'active');

-- airdrop_tasks: anyone can read active tasks
create policy "public can read active tasks"
on public.airdrop_tasks for select
to anon, authenticated
using (active = true);

-- airdrop_submissions: users can read their own submissions only
create policy "users can read own submissions"
on public.airdrop_submissions for select
to authenticated
using (user_id = auth.uid());

-- airdrop_submissions: users can insert their own submissions
create policy "users can insert own submissions"
on public.airdrop_submissions for insert
to authenticated
with check (user_id = auth.uid());

-- airdrop_allocations: users can read their own allocations only
create policy "users can read own allocations"
on public.airdrop_allocations for select
to authenticated
using (user_id = auth.uid());

-- airdrop_audit_log: no direct access via anon or authenticated
-- admin routes use service role key which bypasses RLS
