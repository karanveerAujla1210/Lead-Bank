import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({ target_customer_id: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'customers.write', 'customers.merge');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const { target_customer_id } = schema.parse(await request.json());
    if (id === target_customer_id) return NextResponse.json({ error: 'Cannot merge a customer into itself' }, { status: 400 });

    const { data: source, error: srcErr } = await auth.supabase.from('customers').select('*').eq('id', id).is('deleted_at', null).single();
    if (srcErr || !source) return NextResponse.json({ error: 'Source customer not found' }, { status: 404 });

    const { data: target, error: tgtErr } = await auth.supabase.from('customers').select('*').eq('id', target_customer_id).is('deleted_at', null).single();
    if (tgtErr || !target) return NextResponse.json({ error: 'Target customer not found' }, { status: 404 });

    // Reassign child records to target
    for (const table of ['bank_statements', 'contact_numbers', 'upi_ids', 'salary_records', 'loan_records']) {
      await auth.supabase.from(table as 'bank_statements').update({ customer_id: target_customer_id } as never).eq('customer_id', id);
    }

    // Mark source as merged
    await auth.supabase.from('customers').update({
      merged_into_customer_id: target_customer_id,
      deleted_at: new Date().toISOString(),
      duplicate_score: 100,
    }).eq('id', id);

    await logAudit(auth.supabase, auth.authUser, request, 'customers.merge', 'customers', target_customer_id, source, target);
    return NextResponse.json({ merged_into: target_customer_id, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Merge failed' }, { status: 400 });
  }
}
