import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';
import { paginationSchema } from '@/lib/platform/schemas';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'audit.read', 'audit_logs.read');
  if ('error' in auth) return auth.error;

  const params = paginationSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  let query = auth.supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (params.cursor) query = query.lt('created_at', params.cursor);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, next_cursor: data?.at(-1)?.created_at ?? null });
}
