import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { paginationSchema } from '@/lib/platform/schemas';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  report_type: z.enum(['customers', 'leads', 'statements', 'risk', 'audit']),
  parameters: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'reports.read', 'reports.list');
  if ('error' in auth) return auth.error;
  const params = paginationSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  let query = auth.supabase.from('reports').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(params.limit);
  if (params.cursor) query = query.lt('created_at', params.cursor);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: sanitizeLog(error.message) }, { status: 400 });
  return NextResponse.json({ data, next_cursor: data?.at(-1)?.created_at ?? null });
}

export async function POST(request: Request) {
  const auth = await guardRequest(request, 'reports.write', 'reports.create');
  if ('error' in auth) return auth.error;
  try {
    const payload = schema.parse(await request.json());
    const { data, error } = await auth.supabase.from('reports').insert(payload).select().single();
    if (error) throw error;
    await logAudit(auth.supabase, auth.authUser, request, 'reports.create', 'reports', data.id, undefined, payload);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Report creation failed' }, { status: 400 });
  }
}
