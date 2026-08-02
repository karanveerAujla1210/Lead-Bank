import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getLeadStats, getLeads } from '@/lib/lead-service';
import { getUser } from '@/lib/supabase/auth';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const demoAuth = cookieStore.get('leadbank_demo_auth')?.value === '1';
  const user = await getUser().catch(() => null);
  if (!user && !demoAuth) {
    redirect('/login');
  }

  const [stats, leadsResult] = await Promise.all([getLeadStats(), getLeads({ page: 1 })]);

  return (
    <DashboardView
      stats={stats}
      initialLeads={leadsResult.data}
      totalCount={leadsResult.count}
      pageSize={leadsResult.pageSize}
    />
  );
}
