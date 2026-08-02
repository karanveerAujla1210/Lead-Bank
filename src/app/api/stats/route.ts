import { NextResponse } from 'next/server';
import { getLeadStats } from '@/lib/lead-service';

export async function GET() {
  try {
    const stats = await getLeadStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: 'Unable to load stats' }, { status: 500 });
  }
}
