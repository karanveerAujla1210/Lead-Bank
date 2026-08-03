import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({ target_lead_id: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'leads.write', 'leads.merge');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const { target_lead_id } = schema.parse(await request.json());
    if (id === target_lead_id) return NextResponse.json({ error: 'Cannot merge a lead into itself' }, { status: 400 });

    const { data: source, error: srcErr } = await auth.supabase.from('lead_bank').select('*').eq('id', id).is('deleted_at', null).single();
    if (srcErr || !source) return NextResponse.json({ error: 'Source lead not found' }, { status: 404 });

    const { data: target, error: tgtErr } = await auth.supabase.from('lead_bank').select('*').eq('id', target_lead_id).is('deleted_at', null).single();
    if (tgtErr || !target) return NextResponse.json({ error: 'Target lead not found' }, { status: 404 });

    // Soft-delete source, record merge event on target
    await auth.supabase.from('lead_bank').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    await auth.supabase.from('lead_history').insert({
      lead_id: target_lead_id,
      event_type: 'merged',
      old_value: source,
      new_value: target,
      note: `Merged from lead ${id}`,
    });

    await logAudit(auth.supabase, auth.authUser, request, 'leads.merge', 'lead_bank', target_lead_id, source, target);
    return NextResponse.json({ merged_into: target_lead_id, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Merge failed' }, { status: 400 });
  }
}
