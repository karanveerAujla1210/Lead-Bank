import { NextResponse } from 'next/server';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { createOrMergeCustomer } from '@/lib/platform/customer-service';
import { customerInputSchema, paginationSchema } from '@/lib/platform/schemas';
import { sanitizeLog } from '@/lib/platform/auth';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'customers.read', 'customers.list');
  if ('error' in auth) return auth.error;

  const params = paginationSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  let query = auth.supabase
    .from('customers')
    .select('*, bank_statements(id, bank_name, statement_period_start, statement_period_end), salary_records(*), loan_records(*), contact_numbers(*), upi_ids(*), statement_analysis(*)')
    .is('deleted_at', null)
    .order(params.sort, { ascending: params.order === 'asc' })
    .limit(params.limit);

  if (params.cursor) query = query.lt('created_at', params.cursor);
  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,primary_mobile.ilike.%${params.search}%,primary_email.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: sanitizeLog(error.message) }, { status: 400 });
  return NextResponse.json({ data, next_cursor: data?.at(-1)?.created_at ?? null });
}

export async function POST(request: Request) {
  const auth = await guardRequest(request, 'customers.write', 'customers.create');
  if ('error' in auth) return auth.error;

  try {
    const payload = customerInputSchema.parse(await request.json());
    const result = await createOrMergeCustomer(auth.supabase, payload);
    await logAudit(auth.supabase, auth.authUser, request, result.merged ? 'customers.merge' : 'customers.create', 'customers', result.customer.id, undefined, result.customer);
    return NextResponse.json(result, { status: result.merged ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Customer creation failed' }, { status: 400 });
  }
}
