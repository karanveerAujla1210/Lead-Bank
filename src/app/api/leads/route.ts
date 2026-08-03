import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest } from '@/lib/platform/request-guard';
import { createLead, getLeads } from '@/lib/lead-service';

const leadSchema = z.object({
  customer_name: z.string().min(2),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  source: z.string().default(''),
  city: z.string().default(''),
  remarks: z.string().default(''),
});

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'leads.read', 'leads.list');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') ?? 1);
  const search = searchParams.get('search') ?? '';
  const sort = searchParams.get('sort') ?? 'created_at';
  const order = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc';
  const result = await getLeads({ page, search, sort, order });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await guardRequest(request, 'leads.write', 'leads.create');
  if ('error' in auth) return auth.error;

  try {
    const payload = leadSchema.parse(await request.json());
    const lead = await createLead(payload);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create lead' }, { status: 400 });
  }
}
