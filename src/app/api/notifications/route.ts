import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'customers.read', 'notifications.read');
  if ('error' in auth) return auth.error;

  const { data: appUser } = await auth.supabase.from('users').select('id').eq('auth_user_id', auth.authUser.id).single();
  const { data, error } = await auth.supabase
    .from('notifications')
    .select('*')
    .eq('user_id', appUser?.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
