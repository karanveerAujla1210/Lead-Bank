import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function createClient() {
  if (!url || !anonKey) {
    return null as never;
  }

  return createBrowserClient(url, anonKey);
}
