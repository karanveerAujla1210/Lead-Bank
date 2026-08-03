import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { deleteLead, updateLead } from '@/lib/lead-service';
import { sanitizeLog } from '@/lib/platform/auth';

const leadSchema = z.object({
  customer_name: z.string().min(2),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  source: z.string().default(''),
  city: z.string().default(''),
  remarks: z.string().default(''),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await guardRequest(request, 'leads.write', 'leads.update');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const payload = leadSchema.parse(await request.json());
    const lead = await updateLead(id, payload);
    await logAudit(auth.supabase, auth.authUser, request, 'leads.update', 'lead_bank', id, undefined, lead as unknown as Record<string, unknown>);
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Failed to update lead' }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await guardRequest(request, 'leads.write', 'leads.delete');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    await deleteLead(id);
    await logAudit(auth.supabase, auth.authUser, request, 'leads.delete', 'lead_bank', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Failed to delete lead' }, { status: 400 });
  }
}
