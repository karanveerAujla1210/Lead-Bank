import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';
import { panHash } from '@/lib/platform/customer-service';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'customers.read', 'customers.search');
  if ('error' in auth) return auth.error;

  const searchParams = new URL(request.url).searchParams;
  const q = searchParams.get('q')?.trim() ?? '';
  const pan = searchParams.get('pan')?.trim();
  const mobile = searchParams.get('mobile')?.replace(/\D/g, '').slice(-10);

  let query = auth.supabase
    .from('customers')
    .select('*, bank_statements(*, statement_analysis(*), salary_records(*), loan_records(*), contact_numbers(*), upi_ids(*))')
    .is('deleted_at', null)
    .limit(20);

  if (pan) {
    query = query.eq('pan_hash', panHash(pan));
  } else if (mobile) {
    query = query.eq('primary_mobile', mobile);
  } else {
    query = query.or(`full_name.ilike.%${q}%,primary_mobile.ilike.%${q}%,primary_email.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
