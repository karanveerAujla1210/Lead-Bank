import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({
  assigned_to: z.string().uuid(),
  notes: z.string().trim().max(1000).default(''),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'leads.assign', 'lead.assign');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const payload = schema.parse(await request.json());
    const { data: before } = await auth.supabase.from('lead_bank').select('*').eq('id', id).single();
    const { data: lead, error } = await auth.supabase
      .from('lead_bank')
      .update({ assigned_to: payload.assigned_to, status: 'assigned' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await auth.supabase.from('lead_assignments').insert({
      lead_id: id,
      assigned_to: payload.assigned_to,
      notes: payload.notes,
    });
    await auth.supabase.from('lead_history').insert({
      lead_id: id,
      event_type: 'assigned',
      old_value: before,
      new_value: lead,
      note: payload.notes,
    });
    await logAudit(auth.supabase, auth.authUser, request, 'lead.assign', 'lead_bank', id, before ?? undefined, lead);

    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Lead assignment failed' }, { status: 400 });
  }
}
