import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type Permission =
  | 'leads.read'
  | 'leads.write'
  | 'leads.assign'
  | 'customers.read'
  | 'customers.write'
  | 'statements.read'
  | 'statements.upload'
  | 'statements.process'
  | 'analysis.read'
  | 'reports.read'
  | 'reports.write'
  | 'admin.manage'
  | 'audit.read';

export async function requirePermission(permission: Permission) {
  const workerToken = process.env.WORKER_API_TOKEN;
  const requestHeaders = await import('next/headers').then((mod) => mod.headers()).catch(() => null);
  const authorization = requestHeaders ? (await requestHeaders).get('authorization') : null;
  if (
    permission === 'statements.process' &&
    workerToken &&
    authorization === `Bearer ${workerToken}`
  ) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    return {
      supabase: createAdminClient(),
      authUser: {
        id: '00000000-0000-0000-0000-000000000000',
        app_metadata: {},
        user_metadata: {},
        aud: 'worker',
        created_at: new Date().toISOString(),
      },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  const { data, error } = await supabase.rpc('has_permission', { permission_key: permission });
  if (error || data !== true) {
    return { error: NextResponse.json({ error: 'Permission denied' }, { status: 403 }) };
  }

  return { supabase, authUser: userData.user };
}

/** Strips newline/carriage-return characters to prevent log injection (CWE-117). */
export function sanitizeLog(value: unknown): string {
  return String(value ?? '').replace(/[\r\n]/g, ' ');
}

export function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip');
}
