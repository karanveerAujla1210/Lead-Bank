import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({
  status: z.enum(['new', 'assigned', 'contacted', 'qualified', 'converted', 'rejected', 'closed']),
  note: z.string().trim().max(1000).default(''),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'leads.write', 'lead.status.update');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const payload = schema.parse(await request.json());
    const { data: before } = await auth.supabase.from('lead_bank').select('*').eq('id', id).single();
    const { data: lead, error } = await auth.supabase
      .from('lead_bank')
      .update({ status: payload.status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await auth.supabase.from('lead_history').insert({
      lead_id: id,
      event_type: 'status_changed',
      old_value: before,
      new_value: lead,
      note: payload.note,
    });
    await logAudit(auth.supabase, auth.authUser, request, 'lead.status.update', 'lead_bank', id, before ?? undefined, lead);
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Unable to update status' }, { status: 400 });
  }
}
