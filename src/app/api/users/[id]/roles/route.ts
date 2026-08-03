import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { sanitizeLog } from '@/lib/platform/auth';

const schema = z.object({ role_id: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'admin.manage', 'users.roles.assign');
  if ('error' in auth) return auth.error;
  try {
    const { id } = await params;
    const payload = schema.parse(await request.json());
    const { data, error } = await auth.supabase
      .from('user_roles')
      .upsert({ user_id: id, role_id: payload.role_id }, { onConflict: 'user_id,role_id' })
      .select()
      .single();
    if (error) throw error;
    await logAudit(auth.supabase, auth.authUser, request, 'users.roles.assign', 'users', id, undefined, payload);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Role assignment failed' }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'admin.manage', 'users.roles.remove');
  if ('error' in auth) return auth.error;
  const roleId = new URL(request.url).searchParams.get('role_id');
  if (!roleId) return NextResponse.json({ error: 'role_id is required' }, { status: 400 });
  const { id } = await params;
  const { error } = await auth.supabase.from('user_roles').update({ deleted_at: new Date().toISOString() }).eq('user_id', id).eq('role_id', roleId);
  if (error) return NextResponse.json({ error: sanitizeLog(error.message) }, { status: 400 });
  await logAudit(auth.supabase, auth.authUser, request, 'users.roles.remove', 'users', id, undefined, { role_id: roleId });
  return NextResponse.json({ success: true });
}
