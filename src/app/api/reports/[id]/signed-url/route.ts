import { NextResponse } from 'next/server';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'reports.read', 'reports.signed_url');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data: report, error: reportError } = await auth.supabase.from('reports').select('*').eq('id', id).single();
  if (reportError) return NextResponse.json({ error: sanitizeLog(reportError.message) }, { status: 404 });
  if (!report.storage_bucket || !report.storage_path) return NextResponse.json({ error: 'Report file is not ready' }, { status: 409 });

  const { data, error } = await auth.supabase.storage.from(report.storage_bucket).createSignedUrl(report.storage_path, 300);
  if (error) return NextResponse.json({ error: sanitizeLog(error.message) }, { status: 400 });
  await logAudit(auth.supabase, auth.authUser, request, 'reports.signed_url', 'reports', id);
  return NextResponse.json({ signed_url: data.signedUrl, expires_in: 300 });
}
