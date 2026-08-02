# Lead Bank CRM

A production-ready lead management application built with Next.js, Tailwind CSS, Supabase, and TypeScript.

## Features

- Secure authentication with Supabase Auth
- Protected dashboard and lead management workspace
- Lead CRUD operations with soft deletes
- Search, pagination, and export support
- CSV and Excel upload workflow with validation and duplicate handling
- Responsive fintech-style CRM UI

## Environment variables

Copy .env.example to .env.local and add your Supabase values.

## Supabase SQL

```sql
create extension if not exists "uuid-ossp";

create table if not exists public.lead_bank (
  id uuid primary key default uuid_generate_v4(),
  customer_name text not null,
  mobile text not null unique,
  source text not null,
  city text not null,
  remarks text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_lead_bank_created_at on public.lead_bank (created_at desc);
create index if not exists idx_lead_bank_city on public.lead_bank (city);
create index if not exists idx_lead_bank_source on public.lead_bank (source);
create index if not exists idx_lead_bank_deleted_at on public.lead_bank (deleted_at);
```

## Deployment

1. Deploy the frontend to Vercel.
2. Set the environment variables in Vercel.
3. Configure Supabase Auth redirect URLs for the app domain.
