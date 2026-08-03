import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'admin.manage', 'roles.list');
  if ('error' in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from('roles')
    .select('*, role_permissions(*, permissions(*))')
    .is('deleted_at', null)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
