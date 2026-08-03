# Lead Bank Loan Intelligence Platform

Enterprise-grade loan intelligence and lead management platform built with Next.js, Tailwind CSS, Supabase, and TypeScript.

## Architecture

- Frontend: Next.js + React + Tailwind CSS
- Backend: Supabase Auth, PostgreSQL, Storage, Realtime, Edge Functions
- Queue / async processing: Supabase Edge Functions + background processing pattern
- ORM: Native Supabase client
- Security: Role-based access control (RBAC), Row Level Security (RLS), signed storage URLs

## Key Modules

- Authentication and RBAC
- Lead ingestion, assignment, status tracking, history, and export
- Customer deduplication by PAN, mobile, email
- Secure PDF/Image statement upload to Supabase Storage
- Asynchronous statement parsing and classification pipeline
- Transaction extraction, salary detection, loan detection, contact and UPI extraction
- Audit logging, activity logs, system logs
- Reports, notifications, and platform settings

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase values.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `SUPABASE_STORAGE_BUCKET_STATEMENTS` — statements storage bucket name
- `SUPABASE_STORAGE_BUCKET_DOCUMENTS` — documents storage bucket name
- `SUPABASE_UPLOAD_MAX_BYTES` — maximum upload size in bytes
- `NEXT_PUBLIC_APP_NAME` — application display name

## Supabase Schema

The platform schema includes:

- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `lead_sources`, `lead_bank`, `lead_assignments`, `lead_history`
- `customers`, `customer_documents`
- `bank_statements`, `statement_processing_jobs`, `statement_transactions`, `statement_analysis`
- `salary_records`, `loan_records`, `contact_numbers`, `upi_ids`
- `lender_master`, `lender_keywords`
- `audit_logs`, `activity_logs`, `system_logs`
- `reports`, `settings`, `notifications`

Each table uses `uuid` primary keys, soft deletes, and auditing fields.

## Deployment

1. Deploy the frontend to Vercel using the existing Next.js app.
2. Set production environment variables in Vercel.
3. Provision Supabase and enable Auth, Storage, and Edge Functions.
4. Run the SQL schema in `supabase/schema.sql` or use the migration in `supabase/migrations/20260802120000_create_lead_bank.sql`.
5. Configure RLS and service role keys in Supabase. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
6. Configure storage buckets and use signed URLs for all upload/download operations.

## Notes

- All APIs should validate authentication and permissions.
- Sensitive storage URLs must be private and only accessible through signed URLs.
- File uploads should validate type, size, and content before queueing processing.
- Statement processing should be asynchronous and non-blocking.
- Search and pagination should use indexed query fields and cursor-style patterns for scale.
