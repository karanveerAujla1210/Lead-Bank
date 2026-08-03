import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'customers.read', 'intelligence.read');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('customers')
    .select(
      '*, bank_statements(*, statement_analysis(*), salary_records(*), loan_records(*), contact_numbers(*), upi_ids(*), statement_transactions(*))',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json(data);
}
