import { NextResponse } from 'next/server';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'statements.process', 'statement_jobs.cancel');
  if ('error' in auth) return auth.error;
  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('statement_processing_jobs')
    .update({ status: 'cancelled', locked_by: null, locked_at: null })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: sanitizeLog(error.message) }, { status: 400 });
  await logAudit(auth.supabase, auth.authUser, request, 'statement_jobs.cancel', 'statement_processing_jobs', id);
  return NextResponse.json(data);
}
