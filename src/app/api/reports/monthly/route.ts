import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'reports.read', 'reports.monthly');
  if ('error' in auth) return auth.error;

  const searchParams = new URL(request.url).searchParams;
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  const start = `${month}-01T00:00:00.000Z`;
  const end = new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)).toISOString();

  const [leads, statements, customers, jobs] = await Promise.all([
    auth.supabase.from('lead_bank').select('id, status', { count: 'exact' }).gte('created_at', start).lt('created_at', end),
    auth.supabase.from('bank_statements').select('id', { count: 'exact' }).gte('created_at', start).lt('created_at', end),
    auth.supabase.from('customers').select('id', { count: 'exact' }).gte('created_at', start).lt('created_at', end),
    auth.supabase
      .from('statement_processing_jobs')
      .select('id, status', { count: 'exact' })
      .gte('created_at', start)
      .lt('created_at', end),
  ]);

  const leadsByStatus = (leads.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const jobsByStatus = (jobs.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    month,
    leads_created: leads.count ?? 0,
    leads_by_status: leadsByStatus,
    statements_uploaded: statements.count ?? 0,
    customers_created: customers.count ?? 0,
    jobs_total: jobs.count ?? 0,
    jobs_by_status: jobsByStatus,
  });
}
