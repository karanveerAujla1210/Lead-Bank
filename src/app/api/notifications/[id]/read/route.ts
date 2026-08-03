import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'customers.read', 'notifications.read');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
