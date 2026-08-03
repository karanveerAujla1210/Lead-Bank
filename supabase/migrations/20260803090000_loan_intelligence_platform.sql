create extension if not exists pg_trgm;
create extension if not exists citext;

-- Enums
do $$ begin
  create type public.app_role as enum ('super_admin','admin','audit_staff','credit_manager','operations','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_status as enum ('new','assigned','contacted','qualified','converted','rejected','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum ('queued','processing','completed','failed','retry','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_category as enum (
    'salary','loan_emi','cash_deposit','cash_withdrawal','atm','upi','imps','neft','rtgs',
    'cheque','interest','charges','refund','insurance','investment','subscription',
    'utilities','shopping','transfer','others','unknown'
  );
exception when duplicate_object then null; end $$;

-- Utility functions
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.current_app_user_id()
returns uuid language sql stable as $$
  select id from public.users where id = auth.uid() and deleted_at is null limit 1
$$;

create or replace function public.has_permission(permission_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id and ur.deleted_at is null
    join public.roles r on r.id = ur.role_id and r.deleted_at is null
    join public.role_permissions rp on rp.role_id = r.id and rp.deleted_at is null
    join public.permissions p on p.id = rp.permission_id and p.deleted_at is null
    where u.id = auth.uid()
      and (r.name = 'super_admin' or p.name = permission_key)
  );
$$;

-- Add missing columns to existing tables from migration 1
alter table public.users
  add column if not exists last_seen_at timestamptz;

alter table public.roles
  add column if not exists key text;

alter table public.permissions
  add column if not exists key text,
  add column if not exists module text;

-- Backfill key columns from name
update public.roles set key = name where key is null;
update public.permissions set key = name where key is null;
update public.permissions set module = resource where module is null;

-- New tables not in migration 1
create table if not exists public.lead_sources_v2 (
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

-- Alter lead_bank to add new columns
alter table public.lead_bank
  add column if not exists customer_id uuid references public.customers(id),
  add column if not exists lead_source_id uuid references public.lead_sources(id),
  add column if not exists assigned_to uuid references public.users(id),
  add column if not exists status text not null default 'new',
  add column if not exists email text,
  add column if not exists pan text,
  add column if not exists score integer default 0,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_by uuid references public.users(id),
  add column if not exists updated_by uuid references public.users(id),
  add column if not exists deleted_by uuid references public.users(id),
  add column if not exists pan_encrypted text,
  add column if not exists source_id uuid,
  add column if not exists converted_customer_id uuid;

-- New customers table with enhanced schema (add missing columns)
alter table public.customers
  add column if not exists customer_code text,
  add column if not exists pan_hash text,
  add column if not exists pan_encrypted text,
  add column if not exists primary_mobile text,
  add column if not exists primary_email citext,
  add column if not exists source text not null default 'manual',
  add column if not exists merged_into_customer_id uuid,
  add column if not exists duplicate_score numeric(5,2) not null default 0;

-- New bank_statements columns
alter table public.bank_statements
  add column if not exists document_id uuid,
  add column if not exists account_number_encrypted text,
  add column if not exists statement_period_start date,
  add column if not exists statement_period_end date,
  add column if not exists password_required boolean not null default false,
  add column if not exists password_secret_ref text,
  add column if not exists file_kind text,
  add column if not exists page_count integer not null default 0;

-- New statement_processing_jobs columns
alter table public.statement_processing_jobs
  add column if not exists priority smallint not null default 5,
  add column if not exists attempts integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists error_code text,
  add column if not exists pipeline_state jsonb not null default '{}'::jsonb;

-- New statement_transactions columns
alter table public.statement_transactions
  add column if not exists value_date date,
  add column if not exists reference_number text,
  add column if not exists normalized_hash text,
  add column if not exists category_confidence numeric(5,2) not null default 0;

-- New statement_analysis columns (enhanced)
alter table public.statement_analysis
  add column if not exists opening_balance numeric(18,2),
  add column if not exists closing_balance numeric(18,2),
  add column if not exists average_balance numeric(18,2),
  add column if not exists highest_credit numeric(18,2),
  add column if not exists highest_debit numeric(18,2),
  add column if not exists minimum_balance numeric(18,2),
  add column if not exists maximum_balance numeric(18,2),
  add column if not exists cash_deposits numeric(18,2) not null default 0,
  add column if not exists cash_withdrawals numeric(18,2) not null default 0,
  add column if not exists salary_total numeric(18,2) not null default 0,
  add column if not exists emi_total numeric(18,2) not null default 0,
  add column if not exists loan_count integer not null default 0,
  add column if not exists bounce_charges numeric(18,2) not null default 0,
  add column if not exists monthly_credits jsonb not null default '{}'::jsonb,
  add column if not exists monthly_debits jsonb not null default '{}'::jsonb,
  add column if not exists risk_score numeric(5,2) not null default 0,
  add column if not exists analysis jsonb not null default '{}'::jsonb;

-- Add customer_id to salary_records if missing
alter table public.salary_records
  add column if not exists customer_id uuid references public.customers(id) on delete cascade,
  add column if not exists evidence jsonb not null default '{}'::jsonb;

-- Add lender_type to lender_master
alter table public.lender_master
  add column if not exists lender_type text not null default 'unknown',
  add column if not exists is_active boolean not null default true;

-- Add weight to lender_keywords
alter table public.lender_keywords
  add column if not exists weight numeric(5,2) not null default 1;

-- Add customer_id to loan_records
alter table public.loan_records
  add column if not exists customer_id uuid references public.customers(id) on delete cascade,
  add column if not exists evidence jsonb not null default '{}'::jsonb;

-- Add actor_user_id to audit_logs
alter table public.audit_logs
  add column if not exists actor_user_id uuid references public.users(id),
  add column if not exists resource_type text,
  add column if not exists resource_id uuid,
  add column if not exists ip_address inet,
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb;

-- New notifications columns
alter table public.notifications
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists type text not null default 'info',
  add column if not exists read_at timestamptz;

-- New settings column
alter table public.settings
  add column if not exists is_secret boolean not null default false;

-- Triggers on all tables
do $$
declare t text;
begin
  foreach t in array array[
    'users','roles','permissions','user_roles','role_permissions','lead_sources',
    'lead_bank','customers','lead_assignments','lead_history','customer_documents',
    'bank_statements','statement_processing_jobs','statement_transactions',
    'statement_analysis','salary_records','lender_master','lender_keywords',
    'loan_records','contact_numbers','upi_ids','audit_logs','activity_logs',
    'system_logs','reports','settings','notifications'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Indexes
create index if not exists users_email_trgm_idx on public.users using gin (lower(email) gin_trgm_ops);
create index if not exists customers_name_trgm_idx on public.customers using gin (full_name gin_trgm_ops);
create index if not exists customers_mobile_idx on public.customers (primary_mobile) where deleted_at is null;
create index if not exists customers_pan_hash_idx on public.customers (pan_hash) where deleted_at is null;
create index if not exists statement_jobs_queue_idx on public.statement_processing_jobs (status, priority, available_at, created_at) where deleted_at is null;
create index if not exists statement_transactions_narration_trgm_idx on public.statement_transactions using gin (narration gin_trgm_ops);
create index if not exists statement_transactions_category_idx on public.statement_transactions (category) where deleted_at is null;
create index if not exists salary_customer_idx on public.salary_records (customer_id, salary_date desc) where deleted_at is null;
create index if not exists loan_customer_idx on public.loan_records (customer_id, confidence desc) where deleted_at is null;
create index if not exists contact_number_idx on public.contact_numbers (contact_number) where deleted_at is null;
create index if not exists upi_idx on public.upi_ids (upi_id) where deleted_at is null;
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, read_at, created_at desc) where deleted_at is null;

-- Seed lender data
insert into public.lender_master (lender_name, lender_type)
values
  ('Bajaj Finance','nbfc'),('Axis Bank','bank'),('ICICI Bank','bank'),('Kotak Mahindra Bank','bank'),
  ('Navi','fintech'),('CASHe','fintech'),('Fibe','fintech'),('Moneyview','fintech'),
  ('Kissht','fintech'),('Slice','fintech'),('Ring','fintech'),('LazyPay','fintech'),
  ('Paytm','fintech'),('HDFC Bank','bank'),('IDFC First Bank','bank'),('Yes Bank','bank'),
  ('Punjab National Bank','bank'),('State Bank of India','bank'),('Bank of Baroda','bank'),('Union Bank','bank')
on conflict (lender_name) do update set lender_type = excluded.lender_type;

insert into public.lender_keywords (lender_id, keyword, weight)
select lm.id, kw.keyword, 1
from public.lender_master lm
join (values
  ('Bajaj Finance','BAJAJ'),('Bajaj Finance','BFL'),('Axis Bank','AXIS'),('ICICI Bank','ICICI'),
  ('Kotak Mahindra Bank','KOTAK'),('Navi','NAVI'),('CASHe','CASHE'),('Fibe','FIBE'),
  ('Moneyview','MONEYVIEW'),('Kissht','KISSHT'),('Slice','SLICE'),('Ring','RING'),
  ('LazyPay','LAZYPAY'),('Paytm','PAYTM'),('HDFC Bank','HDFC'),('IDFC First Bank','IDFC'),
  ('Yes Bank','YES'),('Punjab National Bank','PNB'),('State Bank of India','SBI'),
  ('Bank of Baroda','BOB'),('Union Bank','UNION')
) as kw(lender_name, keyword) on kw.lender_name = lm.lender_name
on conflict (lender_id, keyword) do nothing;

-- Job queue functions
create or replace function public.claim_statement_job(worker_id text)
returns public.statement_processing_jobs language plpgsql security definer set search_path = public as $$
declare claimed public.statement_processing_jobs;
begin
  update public.statement_processing_jobs
  set status = 'processing',
      locked_by = worker_id,
      locked_at = now(),
      started_at = coalesce(started_at, now()),
      attempts = attempts + 1
  where id = (
    select id from public.statement_processing_jobs
    where status in ('queued','retry')
      and available_at <= now()
      and deleted_at is null
    order by priority asc, created_at asc
    for update skip locked limit 1
  )
  returning * into claimed;
  return claimed;
end; $$;

create or replace function public.complete_statement_job(job_id uuid, state jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  update public.statement_processing_jobs
  set status = 'completed', completed_at = now(), locked_by = null, locked_at = null,
      pipeline_state = pipeline_state || state
  where id = job_id;
$$;

create or replace function public.fail_statement_job(job_id uuid, code text, message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.statement_processing_jobs
  set status = case when attempts < max_attempts then 'retry'::public.job_status else 'failed'::public.job_status end,
      available_at = case when attempts < max_attempts then now() + interval '5 minutes' else available_at end,
      failed_at = case when attempts >= max_attempts then now() else failed_at end,
      locked_by = null, locked_at = null, error_code = code, error_message = message
  where id = job_id;
end; $$;

-- RLS policies
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select using (auth.uid() = id or public.has_permission('admin.manage'));

drop policy if exists rbac_admin_all on public.roles;
create policy rbac_admin_all on public.roles for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));
drop policy if exists permissions_admin_all on public.permissions;
create policy permissions_admin_all on public.permissions for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));
drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));
drop policy if exists role_permissions_admin_all on public.role_permissions;
create policy role_permissions_admin_all on public.role_permissions for all using (public.has_permission('admin.manage')) with check (public.has_permission('admin.manage'));

drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select using (public.has_permission('audit.read'));
drop policy if exists activity_read on public.activity_logs;
create policy activity_read on public.activity_logs for select using (public.has_permission('audit.read'));
drop policy if exists system_logs_admin_read on public.system_logs;
create policy system_logs_admin_read on public.system_logs for select using (public.has_permission('admin.manage'));

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('customer-documents', 'customer-documents', false, 52428800, array['application/pdf','image/jpeg','image/png']),
  ('reports', 'reports', false, 104857600, array['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_statement_upload on storage.objects;
create policy storage_statement_upload on storage.objects
for insert to authenticated
with check (bucket_id = 'customer-documents' and public.has_permission('manage_statements'));

drop policy if exists storage_statement_read on storage.objects;
create policy storage_statement_read on storage.objects
for select to authenticated
using (bucket_id in ('customer-documents','reports') and (public.has_permission('view_statements') or public.has_permission('view_reports')));

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Deferred indexes on columns added by ALTER TABLE above
create index if not exists lead_bank_status_idx on public.lead_bank (status) where deleted_at is null;
