import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';
import { createUserWithRole } from '@/lib/supabase/rbac';
import { sanitizeLog } from '@/lib/platform/auth';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2).optional(),
  mobile: z.string().optional(),
  pan: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'audit_staff', 'credit_manager', 'operations', 'viewer']).default('viewer'),
});

export async function POST(request: Request) {
  const auth = await guardRequest(request, 'admin.manage', 'users.create');
  if ('error' in auth) return auth.error;

  try {
    const payload = userSchema.parse(await request.json());
    const result = await createUserWithRole(payload);
    await logAudit(auth.supabase, auth.authUser, request, 'users.create', 'users', result.profile.id, undefined, { email: payload.email, role: payload.role });
    return NextResponse.json({ user: result.authUser, profile: result.profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? sanitizeLog(error.message) : 'Failed to create user' }, { status: 400 });
  }
}
