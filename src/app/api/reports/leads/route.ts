import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';
import { paginationSchema } from '@/lib/platform/schemas';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'reports.read', 'reports.leads');
  if ('error' in auth) return auth.error;

  const searchParams = new URL(request.url).searchParams;
  const params = paginationSchema.parse(Object.fromEntries(searchParams));
  const status = searchParams.get('status');

  let query = auth.supabase
    .from('lead_bank')
    .select('*, users!assigned_to(full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (status) query = query.eq('status', status);
  if (params.cursor) query = query.lt('created_at', params.cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, next_cursor: data?.at(-1)?.created_at ?? null });
}
