import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardRequest, logAudit } from '@/lib/platform/request-guard';

const schema = z.object({ password: z.string().min(1).max(128) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'statements.process', 'statements.unlock');
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const { password } = schema.parse(await request.json());
    const { data, error } = await auth.supabase
      .from('bank_statements')
      .update({ password_required: false, password_secret_ref: password })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logAudit(auth.supabase, auth.authUser, request, 'statements.unlock', 'bank_statements', id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unlock failed' }, { status: 400 });
  }
}
