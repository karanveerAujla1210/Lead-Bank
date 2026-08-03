import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/platform/request-guard';
import { getLeadStats } from '@/lib/lead-service';

export async function GET(request: Request) {
  const auth = await guardRequest(request, 'leads.read', 'stats.read');
  if ('error' in auth) return auth.error;

  try {
    const stats = await getLeadStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: 'Unable to load stats' }, { status: 500 });
  }
}
