create extension if not exists pgcrypto;

create table if not exists public.lead_bank (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  mobile text not null,
  source text not null,
  city text not null,
  remarks text not null default '',
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists lead_bank_created_at_idx on public.lead_bank (created_at desc);
create index if not exists lead_bank_mobile_idx on public.lead_bank (mobile);
create index if not exists lead_bank_deleted_at_idx on public.lead_bank (deleted_at);

alter table public.lead_bank enable row level security;

drop policy if exists "allow_all_access" on public.lead_bank;
create policy "allow_all_access"
  on public.lead_bank
  for all
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant all on table public.lead_bank to anon, authenticated;
