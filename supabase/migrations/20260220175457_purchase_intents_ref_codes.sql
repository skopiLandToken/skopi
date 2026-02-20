-- Add referral attribution columns to purchase_intents
-- Marketing Partners (formerly affiliates) foundation

alter table if exists public.purchase_intents
  add column if not exists ft_ref_code text,
  add column if not exists lt_ref_code text;

create index if not exists idx_purchase_intents_ft_ref_code
  on public.purchase_intents(ft_ref_code);

create index if not exists idx_purchase_intents_lt_ref_code
  on public.purchase_intents(lt_ref_code);
