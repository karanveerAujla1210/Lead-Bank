import { NextResponse } from 'next/server';
import { createLead, getLeads } from '@/lib/lead-service';
import { z } from 'zod';

const leadSchema = z.object({
  customer_name: z.string().min(2),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  source: z.string().min(2),
  city: z.string().min(2),
  remarks: z.string().min(2),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') ?? 1);
    const search = searchParams.get('search') ?? '';
    const sort = searchParams.get('sort') ?? 'created_at';
    const order = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc';
    const result = await getLeads({ page, search, sort, order });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve leads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = leadSchema.parse(body);
    const lead = await createLead(payload);
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create lead' }, { status: 400 });
  }
}
