import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const schema = z.object({ refresh_token: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { refresh_token } = schema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: data.session?.expires_at,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Refresh failed' }, { status: 400 });
  }
}
