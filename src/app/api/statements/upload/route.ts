import { NextResponse } from 'next/server';
import { clientIp, sanitizeLog } from '@/lib/platform/auth';
import { encryptField } from '@/lib/platform/crypto';
import { appUserIdForAuth, notifyUser } from '@/lib/platform/notifications';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { allowedStatementMimeTypes, maxStatementFileBytes, statementUploadSchema } from '@/lib/platform/schemas';

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await guardRequest(request, 'statements.upload', 'statements.upload');
  if ('error' in auth) return auth.error;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!allowedStatementMimeTypes.has(file.type) || file.size > maxStatementFileBytes) {
      return NextResponse.json({ error: 'Invalid statement file type or size' }, { status: 400 });
    }

    const payload = statementUploadSchema.parse({
      customer_id: form.get('customer_id'),
      bank_name: form.get('bank_name') || undefined,
      account_number: form.get('account_number') || undefined,
      password: form.get('password') || undefined,
      statement_period_start: form.get('statement_period_start') || undefined,
      statement_period_end: form.get('statement_period_end') || undefined,
    });

    const objectPath = `${payload.customer_id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await auth.supabase.storage
      .from('customer-documents')
      .upload(objectPath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: document, error: documentError } = await auth.supabase
      .from('customer_documents')
      .insert({
        customer_id: payload.customer_id,
        document_type: 'bank_statement',
        bucket: 'customer-documents',
        object_path: objectPath,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      })
      .select()
      .single();
    if (documentError) throw documentError;

    const { data: statement, error: statementError } = await auth.supabase
      .from('bank_statements')
      .insert({
        customer_id: payload.customer_id,
        document_id: document.id,
        bank_name: payload.bank_name,
        account_number_encrypted: encryptField(payload.account_number),
        statement_period_start: payload.statement_period_start?.toISOString().slice(0, 10),
        statement_period_end: payload.statement_period_end?.toISOString().slice(0, 10),
        password_required: Boolean(payload.password),
        password_secret_ref: encryptField(payload.password),
        file_kind: file.type === 'application/pdf' ? 'pdf' : 'image',
      })
      .select()
      .single();
    if (statementError) throw statementError;

    const { data: job, error: jobError } = await auth.supabase
      .from('statement_processing_jobs')
      .insert({ statement_id: statement.id, status: 'queued', pipeline_state: { upload_ip: clientIp(request) } })
      .select()
      .single();
    if (jobError) throw jobError;
    const appUserId = await appUserIdForAuth(auth.supabase, auth.authUser.id);
    await notifyUser(auth.supabase, appUserId, 'Upload received', 'Statement upload completed and processing has been queued.', 'success', {
      statement_id: statement.id,
      job_id: job.id,
    });
    await logAudit(auth.supabase, auth.authUser, request, 'statements.upload', 'bank_statements', statement.id, undefined, {
      document_id: document.id,
      job_id: job.id,
    });

    return NextResponse.json({ statement_id: statement.id, job_id: job.id }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Statement upload failed' }, { status: 400 });
  }
}
