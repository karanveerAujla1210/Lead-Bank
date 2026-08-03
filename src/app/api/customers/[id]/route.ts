import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const updateSchema = z.object({
  full_name: z.string().trim().min(2).max(160).optional(),
  primary_mobile: z.string().trim().regex(/^(?:\+?91)?[6-9]\d{9}$/).optional(),
  primary_email: z.string().trim().email().optional(),
  city: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'customers.read', 'customers.get');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('customers')
    .select('*, bank_statements(*, statement_analysis(*), salary_records(*), loan_records(*)), contact_numbers(*), upi_ids(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'customers.write', 'customers.update');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const payload = updateSchema.parse(await request.json());
    const { data: before } = await auth.supabase.from('customers').select('*').eq('id', id).single();
    const { data, error } = await auth.supabase.from('customers').update(payload).eq('id', id).select().single();
    if (error) throw error;
    await logAudit(auth.supabase, auth.authUser, request, 'customers.update', 'customers', id, before ?? undefined, data);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'customers.write', 'customers.delete');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { error } = await auth.supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: sanitizeLog(error.message) }, { status: 400 });
  await logAudit(auth.supabase, auth.authUser, request, 'customers.delete', 'customers', id);
  return NextResponse.json({ success: true });
}
