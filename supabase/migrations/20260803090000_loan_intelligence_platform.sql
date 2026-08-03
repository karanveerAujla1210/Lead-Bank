create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists citext;

create type public.app_role as enum (
  'super_admin',
  'admin',
  'audit_staff',
  'credit_manager',
  'operations',
  'viewer'
);

create type public.lead_status as enum (
  'new',
  'assigned',
  'contacted',
  'qualified',
  'converted',
  'rejected',
  'closed'
);

create type public.job_status as enum (
  'queued',
  'processing',
  'completed',
  'failed',
  'retry',
  'cancelled'
);

create type public.transaction_category as enum (
  'salary',
  'loan_emi',
  'cash_deposit',
  'cash_withdrawal',
  'atm',
  'upi',
  'imps',
  'neft',
  'rtgs',
  'cheque',
  'interest',
  'charges',
  'refund',
  'insurance',
  'investment',
  'subscription',
  'utilities',
  'shopping',
  'transfer',
  'others',
  'unknown'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select id from public.users where auth_user_id = auth.uid() and deleted_at is null limit 1
$$;

create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id and ur.deleted_at is null
    join public.roles r on r.id = ur.role_id and r.deleted_at is null
    join public.role_permissions rp on rp.role_id = r.id and rp.deleted_at is null
    join public.permissions p on p.id = rp.permission_id and p.deleted_at is null
    where u.auth_user_id = auth.uid()
      and u.deleted_at is null
      and (r.key = 'super_admin' or p.key = permission_key)
  );
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text not null,
  mobile text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key public.app_role not null unique,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module text not null,
  action text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  unique (user_id, role_id)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  unique (role_id, permission_id)
);

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  channel text not null default 'manual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

alter table public.lead_bank
  add column if not exists email citext,
  add column if not exists pan_encrypted text,
  add column if not exists status public.lead_status not null default 'new',
  add column if not exists source_id uuid references public.lead_sources(id),
  add column if not exists assigned_to uuid references public.users(id),
  add column if not exists converted_customer_id uuid,
  add column if not exists created_by uuid references public.users(id),
  add column if not exists updated_by uuid references public.users(id),
  add column if not exists deleted_by uuid references public.users(id);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique default ('CUS-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  full_name text not null,
  pan_hash text unique,
  pan_encrypted text,
  primary_mobile text,
  primary_email citext,
  city text,
  source text not null default 'manual',
  merged_into_customer_id uuid references public.customers(id),
  duplicate_score numeric(5,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

alter table public.lead_bank
  add constraint lead_bank_converted_customer_fk foreign key (converted_customer_id) references public.customers(id) not valid;

create table if not exists public.lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.lead_bank(id) on delete cascade,
  assigned_to uuid not null references public.users(id),
  assigned_by uuid references public.users(id),
  assigned_at timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.lead_bank(id) on delete cascade,
  event_type text not null,
  old_value jsonb,
  new_value jsonb,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  document_type text not null,
  bucket text not null,
  object_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  document_id uuid references public.customer_documents(id),
  bank_name text,
  account_number_encrypted text,
  statement_period_start date,
  statement_period_end date,
  password_required boolean not null default false,
  password_secret_ref text,
  file_kind text not null check (file_kind in ('pdf', 'image')),
  page_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.statement_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  status public.job_status not null default 'queued',
  priority smallint not null default 5,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  locked_by text,
  locked_at timestamptz,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message text,
  pipeline_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.statement_transactions (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_date date not null,
  value_date date,
  narration text not null,
  reference_number text,
  transaction_type text,
  credit numeric(18,2) not null default 0,
  debit numeric(18,2) not null default 0,
  balance numeric(18,2),
  raw_data jsonb not null default '{}'::jsonb,
  normalized_hash text not null,
  category public.transaction_category not null default 'unknown',
  category_confidence numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  unique (statement_id, normalized_hash)
);

create table if not exists public.statement_analysis (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null unique references public.bank_statements(id) on delete cascade,
  opening_balance numeric(18,2),
  closing_balance numeric(18,2),
  average_balance numeric(18,2),
  highest_credit numeric(18,2),
  highest_debit numeric(18,2),
  minimum_balance numeric(18,2),
  maximum_balance numeric(18,2),
  cash_deposits numeric(18,2) not null default 0,
  cash_withdrawals numeric(18,2) not null default 0,
  salary_total numeric(18,2) not null default 0,
  emi_total numeric(18,2) not null default 0,
  loan_count integer not null default 0,
  bounce_charges numeric(18,2) not null default 0,
  monthly_credits jsonb not null default '{}'::jsonb,
  monthly_debits jsonb not null default '{}'::jsonb,
  risk_score numeric(5,2) not null default 0,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.salary_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  employer text not null,
  salary_amount numeric(18,2) not null,
  salary_date date not null,
  confidence numeric(5,2) not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.lender_master (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  lender_type text not null default 'unknown',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.lender_keywords (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references public.lender_master(id) on delete cascade,
  keyword text not null,
  weight numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  unique (lender_id, keyword)
);

create table if not exists public.loan_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  lender_id uuid references public.lender_master(id),
  lender_name text not null,
  emi_amount numeric(18,2) not null,
  frequency text not null default 'monthly',
  estimated_active_loan boolean not null default true,
  confidence numeric(5,2) not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.contact_numbers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  statement_id uuid references public.bank_statements(id) on delete cascade,
  number text not null,
  occurrence_count integer not null default 1,
  transaction_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  unique (customer_id, number)
);

create table if not exists public.upi_ids (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  statement_id uuid references public.bank_statements(id) on delete cascade,
  upi text not null,
  occurrence_count integer not null default 1,
  transaction_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  unique (customer_id, upi)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.activity_logs (like public.audit_logs including all);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  source text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  report_type text not null,
  parameters jsonb not null default '{}'::jsonb,
  generated_by uuid references public.users(id),
  storage_bucket text,
  storage_path text,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  is_secret boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users','roles','permissions','user_roles','role_permissions','lead_sources','lead_bank',
    'customers','lead_assignments','lead_history','customer_documents','bank_statements',
    'statement_processing_jobs','statement_transactions','statement_analysis','salary_records',
    'lender_master','lender_keywords','loan_records','contact_numbers','upi_ids','audit_logs',
    'activity_logs','system_logs','reports','settings','notifications'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create index if not exists users_email_trgm_idx on public.users using gin (email gin_trgm_ops);
create index if not exists customers_name_trgm_idx on public.customers using gin (full_name gin_trgm_ops);
create index if not exists customers_mobile_idx on public.customers (primary_mobile) where deleted_at is null;
create index if not exists customers_email_idx on public.customers (primary_email) where deleted_at is null;
create index if not exists customers_pan_hash_idx on public.customers (pan_hash) where deleted_at is null;
create index if not exists lead_bank_search_idx on public.lead_bank using gin ((customer_name || ' ' || mobile || ' ' || coalesce(email::text, '')) gin_trgm_ops);
create index if not exists lead_bank_status_idx on public.lead_bank (status) where deleted_at is null;
create index if not exists statement_jobs_queue_idx on public.statement_processing_jobs (status, priority, available_at, created_at) where deleted_at is null;
create index if not exists statement_transactions_statement_date_idx on public.statement_transactions (statement_id, transaction_date) where deleted_at is null;
create index if not exists statement_transactions_narration_trgm_idx on public.statement_transactions using gin (narration gin_trgm_ops);
create index if not exists statement_transactions_category_idx on public.statement_transactions (category) where deleted_at is null;
create index if not exists salary_customer_idx on public.salary_records (customer_id, salary_date desc) where deleted_at is null;
create index if not exists loan_customer_idx on public.loan_records (customer_id, confidence desc) where deleted_at is null;
create index if not exists contact_number_idx on public.contact_numbers (number) where deleted_at is null;
create index if not exists upi_idx on public.upi_ids (upi) where deleted_at is null;
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, read_at, created_at desc) where deleted_at is null;

insert into public.roles (key, name, description)
values
  ('super_admin', 'Super Admin', 'Full platform access'),
  ('admin', 'Admin', 'Administrative platform access'),
  ('audit_staff', 'Audit Staff', 'Audit and compliance access'),
  ('credit_manager', 'Credit Manager', 'Credit analysis access'),
  ('operations', 'Operations', 'Operational workflow access'),
  ('viewer', 'Viewer', 'Read-only access')
on conflict (key) do nothing;

insert into public.permissions (key, module, action, description)
values
  ('leads.read','leads','read','Read leads'),
  ('leads.write','leads','write','Create and update leads'),
  ('leads.assign','leads','assign','Assign leads'),
  ('customers.read','customers','read','Read customers'),
  ('customers.write','customers','write','Create and update customers'),
  ('statements.read','statements','read','Read statements'),
  ('statements.upload','statements','upload','Upload bank statements'),
  ('statements.process','statements','process','Process statement jobs'),
  ('analysis.read','analysis','read','Read statement analysis'),
  ('reports.read','reports','read','Read reports'),
  ('reports.write','reports','write','Create reports'),
  ('admin.manage','admin','manage','Manage users, roles and settings'),
  ('audit.read','audit','read','Read audit logs')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key in ('super_admin', 'admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('leads.read','customers.read','statements.read','analysis.read','reports.read','audit.read')
where r.key = 'audit_staff'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('leads.read','customers.read','customers.write','statements.read','statements.upload','analysis.read','reports.read')
where r.key = 'credit_manager'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('leads.read','leads.write','leads.assign','customers.read','customers.write','statements.upload','statements.read')
where r.key = 'operations'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('leads.read','customers.read','statements.read','analysis.read')
where r.key = 'viewer'
on conflict do nothing;

insert into public.lender_master (name, lender_type)
values
  ('Bajaj Finance','nbfc'),('Axis Bank','bank'),('ICICI Bank','bank'),('Kotak Mahindra Bank','bank'),
  ('Navi','fintech'),('CASHe','fintech'),('Fibe','fintech'),('Moneyview','fintech'),
  ('Kissht','fintech'),('Slice','fintech'),('Ring','fintech'),('LazyPay','fintech'),
  ('Paytm','fintech'),('HDFC Bank','bank'),('IDFC First Bank','bank'),('Yes Bank','bank'),
  ('Punjab National Bank','bank'),('State Bank of India','bank'),('Bank of Baroda','bank'),('Union Bank','bank')
on conflict (name) do nothing;

insert into public.lender_keywords (lender_id, keyword, weight)
select lm.id, keyword, 1
from public.lender_master lm
join (values
  ('Bajaj Finance','BAJAJ'),('Bajaj Finance','BFL'),('Axis Bank','AXIS'),('ICICI Bank','ICICI'),
  ('Kotak Mahindra Bank','KOTAK'),('Navi','NAVI'),('CASHe','CASHE'),('Fibe','FIBE'),
  ('Moneyview','MONEYVIEW'),('Kissht','KISSHT'),('Slice','SLICE'),('Ring','RING'),
  ('LazyPay','LAZYPAY'),('Paytm','PAYTM'),('HDFC Bank','HDFC'),('IDFC First Bank','IDFC'),
  ('Yes Bank','YES'),('Punjab National Bank','PNB'),('State Bank of India','SBI'),
  ('Bank of Baroda','BOB'),('Union Bank','UNION')
) as seed(lender_name, keyword) on seed.lender_name = lm.name
on conflict (lender_id, keyword) do nothing;

create or replace function public.claim_statement_job(worker_id text)
returns public.statement_processing_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.statement_processing_jobs;
begin
  update public.statement_processing_jobs
  set status = 'processing',
      locked_by = worker_id,
      locked_at = now(),
      started_at = coalesce(started_at, now()),
      attempts = attempts + 1
  where id = (
    select id
    from public.statement_processing_jobs
    where status in ('queued', 'retry')
      and available_at <= now()
      and deleted_at is null
    order by priority asc, created_at asc
    for update skip locked
    limit 1
  )
  returning * into claimed;

  return claimed;
end;
$$;

create or replace function public.complete_statement_job(job_id uuid, state jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update public.statement_processing_jobs
  set status = 'completed',
      completed_at = now(),
      locked_by = null,
      locked_at = null,
      pipeline_state = pipeline_state || state
  where id = job_id;
$$;

create or replace function public.fail_statement_job(job_id uuid, code text, message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.statement_processing_jobs
  set status = case when attempts < max_attempts then 'retry'::public.job_status else 'failed'::public.job_status end,
      available_at = case when attempts < max_attempts then now() + interval '5 minutes' else available_at end,
      failed_at = case when attempts >= max_attempts then now() else failed_at end,
      locked_by = null,
      locked_at = null,
      error_code = code,
      error_message = message
  where id = job_id;
end;
$$;

drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select using (auth.uid() = auth_user_id or public.has_permission('admin.manage'));

drop policy if exists rbac_admin_all on public.roles;
create policy rbac_admin_all on public.roles for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));
drop policy if exists permissions_admin_all on public.permissions;
create policy permissions_admin_all on public.permissions for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));
drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));
drop policy if exists role_permissions_admin_all on public.role_permissions;
create policy role_permissions_admin_all on public.role_permissions for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));

do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('lead_sources','leads.read','leads.write'),
      ('lead_bank','leads.read','leads.write'),
      ('lead_assignments','leads.read','leads.assign'),
      ('lead_history','leads.read','leads.write'),
      ('customers','customers.read','customers.write'),
      ('customer_documents','statements.read','statements.upload'),
      ('bank_statements','statements.read','statements.upload'),
      ('statement_processing_jobs','statements.read','statements.process'),
      ('statement_transactions','statements.read','statements.process'),
      ('statement_analysis','analysis.read','statements.process'),
      ('salary_records','analysis.read','statements.process'),
      ('loan_records','analysis.read','statements.process'),
      ('contact_numbers','analysis.read','statements.process'),
      ('upi_ids','analysis.read','statements.process'),
      ('lender_master','analysis.read','admin.manage'),
      ('lender_keywords','analysis.read','admin.manage'),
      ('reports','reports.read','reports.write'),
      ('settings','admin.manage','admin.manage'),
      ('notifications','customers.read','customers.write')
    ) as t(table_name, read_permission, write_permission)
  loop
    execute format('drop policy if exists %I_read on public.%I', item.table_name, item.table_name);
    execute format('create policy %I_read on public.%I for select using (deleted_at is null and public.has_permission(%L))', item.table_name, item.table_name, item.read_permission);
    execute format('drop policy if exists %I_insert on public.%I', item.table_name, item.table_name);
    execute format('create policy %I_insert on public.%I for insert with check (public.has_permission(%L))', item.table_name, item.table_name, item.write_permission);
    execute format('drop policy if exists %I_update on public.%I', item.table_name, item.table_name);
    execute format('create policy %I_update on public.%I for update using (public.has_permission(%L)) with check (public.has_permission(%L))', item.table_name, item.table_name, item.write_permission, item.write_permission);
  end loop;
end $$;

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select using (public.has_permission('audit.read'));
drop policy if exists activity_read on public.activity_logs;
create policy activity_read on public.activity_logs for select using (public.has_permission('audit.read'));
drop policy if exists system_logs_admin_read on public.system_logs;
create policy system_logs_admin_read on public.system_logs for select using (public.has_permission('admin.manage'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('customer-documents', 'customer-documents', false, 52428800, array['application/pdf','image/jpeg','image/png']),
  ('reports', 'reports', false, 104857600, array['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_statement_upload on storage.objects;
create policy storage_statement_upload on storage.objects
for insert to authenticated
with check (bucket_id = 'customer-documents' and public.has_permission('statements.upload'));

drop policy if exists storage_statement_read on storage.objects;
create policy storage_statement_read on storage.objects
for select to authenticated
using (bucket_id in ('customer-documents','reports') and (public.has_permission('statements.read') or public.has_permission('reports.read')));

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
