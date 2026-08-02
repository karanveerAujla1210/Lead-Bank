import { NextResponse } from 'next/server';
import { deleteLead, updateLead } from '@/lib/lead-service';
import { z } from 'zod';

const leadSchema = z.object({
  customer_name: z.string().min(2),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  source: z.string().min(2),
  city: z.string().min(2),
  remarks: z.string().min(2),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const payload = leadSchema.parse(body);
    const lead = await updateLead(id, payload);
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update lead' }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete lead' }, { status: 400 });
  }
}
