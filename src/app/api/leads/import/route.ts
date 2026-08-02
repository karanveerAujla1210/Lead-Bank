import { NextResponse } from 'next/server';
import { importLeads } from '@/lib/lead-service';
import { z } from 'zod';

const recordSchema = z.object({
  customer_name: z.string().min(2),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  source: z.string().min(2),
  city: z.string().min(2),
  remarks: z.string().min(2),
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
