import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { clientIp, sanitizeLog, type Permission, requirePermission } from './auth';

const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_MAX_REQUESTS = 120;

export async function guardRequest(request: Request, permission: Permission, action: string) {
  const auth = await requirePermission(permission);
  if ('error' in auth) return auth;

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  if (auth.authUser.aud === 'worker') {
    return auth;
  }
  const safeAction = sanitizeLog(action);
  const { count } = await auth.supabase
    .from('activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('actor_user_id', await appUserId(auth.supabase, auth.authUser))
    .eq('action', safeAction)
    .gte('created_at', since);

  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return { error: NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }) };
  }

  await logActivity(auth.supabase, auth.authUser, request, safeAction, 'api_request');
  return auth;
}

export async function logActivity(
  supabase: SupabaseClient,
  user: User,
  request: Request,
  action: string,
  resourceType: string,
  resourceId?: string,
  afterData?: Record<string, unknown>,
) {
  await supabase.from('activity_logs').insert({
    actor_user_id: await appUserId(supabase, user),
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: clientIp(request),
    user_agent: request.headers.get('user-agent'),
    after_data: afterData,
  });
}

export async function logAudit(
  supabase: SupabaseClient,
  user: User,
  request: Request,
  action: string,
  resourceType: string,
  resourceId?: string,
  beforeData?: Record<string, unknown>,
  afterData?: Record<string, unknown>,
) {
  await supabase.from('audit_logs').insert({
    actor_user_id: await appUserId(supabase, user),
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: clientIp(request),
    user_agent: request.headers.get('user-agent'),
    before_data: beforeData,
    after_data: afterData,
  });
}

async function appUserId(supabase: SupabaseClient, user: User) {
  const { data } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
  return data?.id ?? null;
}
