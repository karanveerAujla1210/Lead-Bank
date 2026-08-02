import { NextResponse } from 'next/server';
import { importLeads } from '@/lib/lead-service';
import { z } from 'zod';

export const maxDuration = 60;

const recordSchema = z.object({
  customer_name: z.string().trim().min(1),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  source: z.string().default(''),
  city: z.string().default(''),
  remarks: z.string().default(''),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const records = z.array(recordSchema).parse(body.records ?? []);
    const inserted = await importLeads(records);
    return NextResponse.json({ inserted: inserted.length, duplicates: 0, invalid: 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Import failed' }, { status: 400 });
  }
}
