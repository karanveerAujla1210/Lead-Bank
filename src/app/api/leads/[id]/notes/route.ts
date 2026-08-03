import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({ note: z.string().trim().min(1).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'leads.write', 'lead.notes.create');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const payload = schema.parse(await request.json());
    const { data, error } = await auth.supabase
      .from('lead_history')
      .insert({ lead_id: id, event_type: 'note', note: payload.note })
      .select()
      .single();
    if (error) throw error;
    await logAudit(auth.supabase, auth.authUser, request, 'lead.notes.create', 'lead_bank', id, undefined, { note_id: data.id });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Unable to add note' }, { status: 400 });
  }
}
