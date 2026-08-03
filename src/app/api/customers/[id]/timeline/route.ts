import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'customers.read', 'customers.timeline');
  if ('error' in auth) return auth.error;

  const { id } = await params;

  const [statementsRes, auditRes] = await Promise.all([
    auth.supabase
      .from('bank_statements')
      .select('id, bank_name, statement_period_start, statement_period_end, created_at, statement_processing_jobs(id, status, completed_at, failed_at), statement_analysis(risk_score, salary_total, emi_total, loan_count)')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    auth.supabase
      .from('audit_logs')
      .select('id, action, resource_type, resource_id, ip_address, created_at, after_data')
      .eq('resource_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (statementsRes.error) return NextResponse.json({ error: statementsRes.error.message }, { status: 400 });

  return NextResponse.json({
    statements: statementsRes.data ?? [],
    audit: auditRes.data ?? [],
  });
}
