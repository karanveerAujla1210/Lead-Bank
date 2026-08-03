# Loan Intelligence Platform Backend

## Architecture

The backend uses Supabase Auth, PostgreSQL, RLS, private Supabase Storage, Next.js REST route handlers, and Supabase Edge Functions for queued statement processing.

Core files:

- `supabase/migrations/20260803090000_loan_intelligence_platform.sql`
- `src/lib/platform/*`
- `src/app/api/customers/*`
- `src/app/api/statements/*`
- `supabase/functions/process-statement/index.ts`

## Environment

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FIELD_ENCRYPTION_KEY=
```

`FIELD_ENCRYPTION_KEY` is used for AES-256-GCM encryption of sensitive fields before storage.

## API Surface

- `GET /api/customers`: cursor-paginated customer search.
- `POST /api/customers`: creates a customer or merges into an existing customer by PAN hash, mobile, or email.
- `GET /api/customers/search?q=&pan=&mobile=`: instant customer intelligence lookup.
- `POST /api/leads/:id/assign`: assigns a lead and writes assignment/history/audit rows.
- `GET /api/leads/:id/timeline`: returns lead history and notes.
- `POST /api/statements/upload`: validates file type and size, uploads to private storage, creates a bank statement and queued job, returns `job_id`.
- `GET /api/statements/jobs/:id`: reads processing job status and statement analysis.
- `POST /api/statements/:id/transactions`: ingests parsed transactions, classifies them, extracts contacts and UPI IDs, and upserts statement analysis.
- `POST /api/documents/:id/signed-url`: creates a private Supabase Storage signed URL with a 5-minute expiry.
- `GET /api/notifications`: lists current-user notifications.
- `POST /api/notifications/:id/read`: marks a notification read.
- `GET /api/audit-logs`: cursor-paginated audit log access.
- `GET /api/settings`: admin settings read with secret values masked.
- `PUT /api/settings`: admin setting upsert.
- `POST /api/users`: creates a Supabase Auth user, profile, and role assignment.

All new APIs require Supabase authentication and validate RBAC through `public.has_permission`. The shared request guard writes activity logs and enforces a per-user request limit.

## Processing Pipeline

Uploads never block on parsing. They create `statement_processing_jobs` rows in `queued` state. The `process-statement` Edge Function claims jobs with `claim_statement_job`, logs the adapter handoff, and updates the job through `complete_statement_job` or `fail_statement_job`.

The parser contract is the `transactionSchema` in `src/lib/platform/schemas.ts`. OCR/PDF extraction adapters should submit normalized transaction arrays to `POST /api/statements/:id/transactions`.

## Database

The migration adds normalized tables for roles, permissions, leads, customers, documents, bank statements, jobs, transactions, analysis, salary, loans, contacts, UPI IDs, logs, reports, settings, notifications, lender master data, and lender keywords.

All domain tables include UUID primary keys, audit timestamps, soft-delete fields, actor columns, RLS, and indexes for search or queue access.
