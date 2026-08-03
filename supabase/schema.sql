create extension if not exists pgcrypto;

-- Users and RBAC
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  mobile text,
  pan text,
  is_active boolean not null default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  constraint role_permission_unique unique (role_id, permission_id)
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  constraint user_role_unique unique (user_id, role_id)
);

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  mobile text,
  pan text,
  date_of_birth date,
  gender text,
  address text,
  city text,
  state text,
  country text,
  customer_status text not null default 'active',
  source_id uuid references public.lead_sources(id),
  duplicate_of uuid references public.customers(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  document_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  content_type text,
  file_size bigint,
  status text not null default 'pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.lead_bank (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id),
  lead_source_id uuid references public.lead_sources(id),
  assigned_to uuid references public.users(id),
  status text not null default 'new',
  source text,
  customer_name text not null,
  mobile text not null,
  email text,
  pan text,
  city text,
  remarks text default '',
  score integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.lead_bank(id) on delete cascade,
  assigned_to uuid not null references public.users(id),
  assigned_by uuid references public.users(id),
  assigned_at timestamptz not null default now(),
  status text not null default 'assigned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.lead_bank(id) on delete cascade,
  action text not null,
  changed_by uuid references public.users(id),
  changed_at timestamptz not null default now(),
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  account_number text not null,
  account_type text,
  bank_name text,
  statement_month date,
  statement_period jsonb,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  content_type text,
  file_size bigint,
  processed boolean not null default false,
  status text not null default 'uploaded',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.statement_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  requested_by uuid references public.users(id),
  queue_name text not null default 'statement-processing',
  status text not null default 'queued',
  priority text not null default 'normal',
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  payload jsonb default '{}'::jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.statement_transactions (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  job_id uuid references public.statement_processing_jobs(id),
  transaction_date date not null,
  posted_date date,
  narration text,
  transaction_reference text,
  transaction_type text,
  credit numeric(18,2) default 0,
  debit numeric(18,2) default 0,
  balance numeric(18,2),
  category text,
  subcategory text,
  raw_data jsonb default '{}'::jsonb,
  normalized_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.statement_analysis (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  summary jsonb default '{}'::jsonb,
  score numeric(5,2),
  status text not null default 'pending',
  analysis_version text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.salary_records (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_id uuid references public.statement_transactions(id) on delete set null,
  employer text,
  salary_amount numeric(18,2),
  salary_date date,
  confidence numeric(5,2),
  pattern text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.loan_records (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_id uuid references public.statement_transactions(id) on delete set null,
  lender_id uuid references public.lender_master(id),
  lender_name text,
  emi_amount numeric(18,2),
  frequency text,
  estimated_active_loan boolean default false,
  confidence numeric(5,2),
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.contact_numbers (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_id uuid references public.statement_transactions(id) on delete set null,
  contact_number text not null,
  occurrence_count integer not null default 1,
  related_transactions jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.upi_ids (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_id uuid references public.statement_transactions(id) on delete set null,
  upi_id text not null,
  occurrence_count integer not null default 1,
  related_transactions jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.lender_master (
  id uuid primary key default gen_random_uuid(),
  lender_name text not null unique,
  industry text,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.lender_keywords (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references public.lender_master(id) on delete cascade,
  keyword text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  constraint lender_keyword_unique unique (lender_id, lower(keyword))
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  action text not null,
  resource text,
  resource_id uuid,
  ip_address text,
  user_agent text,
  browser text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  activity_type text not null,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  level text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_name text not null,
  report_type text not null,
  filters jsonb default '{}'::jsonb,
  result jsonb,
  generated_by uuid references public.users(id),
  generated_at timestamptz not null default now(),
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  category text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  notification_type text not null,
  status text not null default 'pending',
  payload jsonb default '{}'::jsonb,
  delivered_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid
);

-- Indexes for search and cardinality
create index if not exists idx_users_email on public.users(lower(email));
create index if not exists idx_users_mobile on public.users(mobile);
create index if not exists idx_users_pan on public.users(lower(pan));
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);
create index if not exists idx_customers_mobile on public.customers(mobile);
create index if not exists idx_customers_email on public.customers(lower(email));
create index if not exists idx_customers_pan on public.customers(lower(pan));
create index if not exists idx_lead_bank_mobile on public.lead_bank(mobile);
create index if not exists idx_lead_bank_status on public.lead_bank(status);
create index if not exists idx_lead_bank_assigned_to on public.lead_bank(assigned_to);
create index if not exists idx_bank_statements_customer_id on public.bank_statements(customer_id);
create index if not exists idx_bank_statements_status on public.bank_statements(status);
create index if not exists idx_statement_processing_jobs_status on public.statement_processing_jobs(status);
create index if not exists idx_statement_transactions_date on public.statement_transactions(transaction_date);
create index if not exists idx_statement_transactions_category on public.statement_transactions(category);
create index if not exists idx_statement_transactions_reference on public.statement_transactions(transaction_reference);
create index if not exists idx_salary_records_employer on public.salary_records(lower(employer));
create index if not exists idx_loan_records_lender_name on public.loan_records(lower(lender_name));
create index if not exists idx_contact_numbers_number on public.contact_numbers(contact_number);
create index if not exists idx_upi_ids_upi_id on public.upi_ids(upi_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_reports_status on public.reports(status);

-- Security helper functions
create or replace function public.app_current_user_id() returns uuid as $$
  select auth.uid()::uuid;
$$ language sql stable;

create or replace function public.app_has_role(role_name text) returns boolean as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on ur.role_id = r.id
    where ur.user_id = auth.uid()::uuid
      and ur.active
      and ur.deleted_at is null
      and lower(r.name) = lower(role_name)
  );
$$ language sql stable;

create or replace function public.app_has_permission(resource_name text, action_name text) returns boolean as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on ur.role_id = r.id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()::uuid
      and ur.active
      and ur.deleted_at is null
      and lower(p.resource) = lower(resource_name)
      and lower(p.action) = lower(action_name)
  );
$$ language sql stable;

-- Row level security policies
alter table public.users enable row level security;
drop policy if exists "users_self_or_role" on public.users;
create policy "users_self_or_role" on public.users for all using (
  auth.uid() is not null
    and (
      id = auth.uid()::uuid
      or public.app_has_role('super_admin')
      or public.app_has_role('admin')
    )
) with check (
  auth.uid() is not null
    and (
      id = auth.uid()::uuid
      or public.app_has_role('super_admin')
      or public.app_has_role('admin')
    )
);

alter table public.customers enable row level security;
drop policy if exists "customers_authenticated" on public.customers;
create policy "customers_authenticated" on public.customers for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.lead_bank enable row level security;
drop policy if exists "lead_bank_authenticated" on public.lead_bank;
create policy "lead_bank_authenticated" on public.lead_bank for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.lead_assignments enable row level security;
drop policy if exists "lead_assignments_authenticated" on public.lead_assignments;
create policy "lead_assignments_authenticated" on public.lead_assignments for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.lead_history enable row level security;
drop policy if exists "lead_history_authenticated" on public.lead_history;
create policy "lead_history_authenticated" on public.lead_history for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.bank_statements enable row level security;
drop policy if exists "bank_statements_authenticated" on public.bank_statements;
create policy "bank_statements_authenticated" on public.bank_statements for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.statement_processing_jobs enable row level security;
drop policy if exists "statement_processing_jobs_authenticated" on public.statement_processing_jobs;
create policy "statement_processing_jobs_authenticated" on public.statement_processing_jobs for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.statement_transactions enable row level security;
drop policy if exists "statement_transactions_authenticated" on public.statement_transactions;
create policy "statement_transactions_authenticated" on public.statement_transactions for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.statement_analysis enable row level security;
drop policy if exists "statement_analysis_authenticated" on public.statement_analysis;
create policy "statement_analysis_authenticated" on public.statement_analysis for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.salary_records enable row level security;
drop policy if exists "salary_records_authenticated" on public.salary_records;
create policy "salary_records_authenticated" on public.salary_records for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.loan_records enable row level security;
drop policy if exists "loan_records_authenticated" on public.loan_records;
create policy "loan_records_authenticated" on public.loan_records for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.contact_numbers enable row level security;
drop policy if exists "contact_numbers_authenticated" on public.contact_numbers;
create policy "contact_numbers_authenticated" on public.contact_numbers for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.upi_ids enable row level security;
drop policy if exists "upi_ids_authenticated" on public.upi_ids;
create policy "upi_ids_authenticated" on public.upi_ids for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.customer_documents enable row level security;
drop policy if exists "customer_documents_authenticated" on public.customer_documents;
create policy "customer_documents_authenticated" on public.customer_documents for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.notifications enable row level security;
drop policy if exists "notifications_authenticated" on public.notifications;
create policy "notifications_authenticated" on public.notifications for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_authenticated" on public.audit_logs;
create policy "audit_logs_authenticated" on public.audit_logs for select using (
  auth.uid() is not null
) with check (false);

alter table public.activity_logs enable row level security;
drop policy if exists "activity_logs_authenticated" on public.activity_logs;
create policy "activity_logs_authenticated" on public.activity_logs for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.system_logs enable row level security;
drop policy if exists "system_logs_authenticated" on public.system_logs;
create policy "system_logs_authenticated" on public.system_logs for all using (
  public.app_has_role('super_admin')
) with check (
  public.app_has_role('super_admin')
);

alter table public.reports enable row level security;
drop policy if exists "reports_authenticated" on public.reports;
create policy "reports_authenticated" on public.reports for all using (
  auth.uid() is not null
) with check (
  auth.uid() is not null
);

alter table public.settings enable row level security;
drop policy if exists "settings_authenticated" on public.settings;
create policy "settings_authenticated" on public.settings for all using (
  public.app_has_role('super_admin')
) with check (
  public.app_has_role('super_admin')
);

alter table public.role_permissions enable row level security;
drop policy if exists "role_permissions_authenticated" on public.role_permissions;
create policy "role_permissions_authenticated" on public.role_permissions for all using (
  public.app_has_role('super_admin')
) with check (
  public.app_has_role('super_admin')
);

alter table public.roles enable row level security;
drop policy if exists "roles_authenticated" on public.roles;
create policy "roles_authenticated" on public.roles for all using (
  public.app_has_role('super_admin')
) with check (
  public.app_has_role('super_admin')
);

alter table public.permissions enable row level security;
drop policy if exists "permissions_authenticated" on public.permissions;
create policy "permissions_authenticated" on public.permissions for all using (
  public.app_has_role('super_admin')
) with check (
  public.app_has_role('super_admin')
);

-- Seed platform roles and permissions if not present
insert into public.roles (name, description) values
  ('super_admin', 'Full platform administrator with access to all resources'),
  ('admin', 'Administrative user with platform management rights'),
  ('audit_staff', 'Audit staff with read access to customer and statement activity'),
  ('credit_manager', 'Credit manager with loan and statement analysis privileges'),
  ('operations', 'Operations user with statement upload and queue management'),
  ('viewer', 'Read-only user for dashboard and reporting')
  on conflict (name) do nothing;

insert into public.permissions (name, resource, action, description) values
  ('manage_users', 'users', 'manage', 'Create, update and delete platform users'),
  ('manage_roles', 'roles', 'manage', 'Create and manage roles and permissions'),
  ('view_customers', 'customers', 'read', 'Read customer profiles and associated statements'),
  ('manage_customers', 'customers', 'write', 'Create and update customer records'),
  ('view_statements', 'bank_statements', 'read', 'Read bank statement metadata'),
  ('manage_statements', 'bank_statements', 'write', 'Upload and manage statement metadata'),
  ('process_jobs', 'statement_processing_jobs', 'write', 'Manage background processing jobs'),
  ('view_transactions', 'statement_transactions', 'read', 'Read extracted transaction data'),
  ('view_analysis', 'statement_analysis', 'read', 'Read statement analysis results'),
  ('view_reports', 'reports', 'read', 'Read generated reports'),
  ('manage_settings', 'settings', 'manage', 'Configure system settings'),
  ('view_notifications', 'notifications', 'read', 'Read in-app notifications'),
  ('manage_notifications', 'notifications', 'write', 'Create notification events')
  on conflict (name) do nothing;

insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.name in (
    'manage_users', 'manage_roles', 'view_customers', 'manage_customers',
    'view_statements', 'manage_statements', 'process_jobs', 'view_transactions',
    'view_analysis', 'view_reports', 'manage_settings', 'view_notifications', 'manage_notifications'
  )
  where r.name = 'super_admin'
  on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.name in (
    'view_customers', 'manage_customers', 'view_statements', 'manage_statements', 'process_jobs', 'view_transactions', 'view_analysis', 'view_reports', 'view_notifications', 'manage_notifications'
  )
  where r.name = 'admin'
  on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.name in (
    'view_customers', 'view_statements', 'view_transactions', 'view_analysis', 'view_reports', 'view_notifications'
  )
  where r.name = 'audit_staff'
  on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.name in (
    'view_customers', 'view_statements', 'view_transactions', 'view_analysis', 'view_reports', 'view_notifications'
  )
  where r.name = 'credit_manager'
  on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.name in (
    'view_customers', 'view_statements', 'view_transactions', 'view_analysis', 'view_reports', 'view_notifications'
  )
  where r.name = 'operations'
  on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
  from public.roles r
  join public.permissions p on p.name in (
    'view_customers', 'view_statements', 'view_transactions', 'view_analysis', 'view_reports', 'view_notifications'
  )
  where r.name = 'viewer'
  on conflict (role_id, permission_id) do nothing;
