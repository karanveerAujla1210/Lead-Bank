import type { SupabaseClient } from '@supabase/supabase-js';

export async function notifyUser(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  payload: Record<string, unknown> = {},
) {
  if (!userId) return;
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    payload,
  });
}

export async function appUserIdForAuth(supabase: SupabaseClient, authUserId: string) {
  const { data } = await supabase.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle();
  return data?.id ?? null;
}
