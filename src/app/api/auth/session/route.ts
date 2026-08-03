import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return NextResponse.json({ error: 'No active session' }, { status: 401 });
  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, is_active, user_roles(role_id, roles(key, name))')
    .eq('auth_user_id', data.session.user.id)
    .single();
  return NextResponse.json({ session: data.session, profile });
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: 'Signed out' });
}
