import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardRequest(request, 'leads.read', 'lead.timeline.read');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data, error } = await auth.supabase
    .from('lead_history')
    .select('*')
    .eq('lead_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
