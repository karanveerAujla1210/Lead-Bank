import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
