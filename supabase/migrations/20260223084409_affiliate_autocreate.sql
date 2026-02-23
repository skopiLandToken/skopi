-- Auto-create an affiliate record for every new auth user.
-- SAFE: uses IF NOT EXISTS style patterns where possible.

-- 1) Ensure affiliates table exists (skip if you already have it; adjust if needed)
-- If you already have affiliates table, comment this block out.
-- create table if not exists public.affiliates (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null unique,
--   ref_code text not null unique,
--   created_at timestamptz not null default now()
-- );

-- 2) Helper to generate a short-ish ref code
create or replace function public.generate_ref_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.affiliates where ref_code = code);
  end loop;
  return code;
end;
$$;

-- 3) Trigger function: create affiliate row on new auth user
create or replace function public.handle_new_user_create_affiliate()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.affiliates (user_id, ref_code)
  values (new.id, public.generate_ref_code())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- 4) Trigger on auth.users
drop trigger if exists on_auth_user_created_create_affiliate on auth.users;

create trigger on_auth_user_created_create_affiliate
after insert on auth.users
for each row execute procedure public.handle_new_user_create_affiliate();
