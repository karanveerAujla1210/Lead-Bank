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
