drop policy if exists "allow_all_access" on public.lead_bank;

create index if not exists activity_logs_actor_action_idx
  on public.activity_logs (user_id, activity_type, created_at desc);

create index if not exists reports_status_idx
  on public.reports (status, created_at desc)
  where deleted_at is null;

alter table public.salary_records
  add constraint salary_records_statement_employer_date_unique
  unique (statement_id, employer, salary_date);

alter table public.loan_records
  add constraint loan_records_statement_lender_amount_unique
  unique (statement_id, lender_name, emi_amount);
