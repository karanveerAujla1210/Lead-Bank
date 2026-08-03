import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({
  key: z.string().trim().min(2).max(120),
  value: z.record(z.string(), z.unknown()),
  is_secret: z.boolean().default(false),
});

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'admin.manage', 'settings.read');
  if ('error' in auth) return auth.error;
  const { data, error } = await auth.supabase.from('settings').select('*').is('deleted_at', null).order('key');
  if (error) return NextResponse.json({ error: sanitizeLog(error.message) }, { status: 400 });
  return NextResponse.json({ data: data?.map((item) => item.is_secret ? { ...item, value: null } : item) });
}

export async function PUT(request: Request) {
  const auth = await guardRequest(request, 'admin.manage', 'settings.write');
  if ('error' in auth) return auth.error;

  try {
    const payload = schema.parse(await request.json());
    const { data, error } = await auth.supabase
      .from('settings')
      .upsert(payload, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    await logAudit(auth.supabase, auth.authUser, request, 'settings.write', 'settings', data.id, undefined, { key: payload.key });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Settings update failed' }, { status: 400 });
  }
}
