import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'statements.read', 'statement_jobs.read');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('statement_processing_jobs')
    .select('*, bank_statements(*, statement_analysis(*))')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
