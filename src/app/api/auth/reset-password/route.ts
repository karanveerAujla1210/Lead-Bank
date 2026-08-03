import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const requestSchema = z.object({ email: z.string().email() });
const confirmSchema = z.object({ new_password: z.string().min(8) });

// POST /api/auth/reset-password  { email }  → sends reset email
// PUT  /api/auth/reset-password  { new_password }  → confirms reset (user must be authenticated via magic link)
export async function POST(request: Request) {
  try {
    const { email } = requestSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/login?type=recovery`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: 'Password reset email sent' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { new_password } = confirmSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: 'Password updated' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }
}
