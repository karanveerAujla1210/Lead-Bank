import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'reports.read', 'reports.daily');
  if ('error' in auth) return auth.error;

  const dateParam = new URL(request.url).searchParams.get('date');
  const date = dateParam ?? new Date().toISOString().slice(0, 10);
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  const [leads, statements, customers] = await Promise.all([
    auth.supabase.from('lead_bank').select('id, status', { count: 'exact' }).gte('created_at', start).lte('created_at', end),
    auth.supabase.from('bank_statements').select('id', { count: 'exact' }).gte('created_at', start).lte('created_at', end),
    auth.supabase.from('customers').select('id', { count: 'exact' }).gte('created_at', start).lte('created_at', end),
  ]);

  return NextResponse.json({
    date,
    leads_created: leads.count ?? 0,
    statements_uploaded: statements.count ?? 0,
    customers_created: customers.count ?? 0,
  });
}
