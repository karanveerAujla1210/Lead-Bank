import { redirect } from 'next/navigation';
import { getLeadStats, getLeads } from '@/lib/lead-service';
import { getUser } from '@/lib/supabase/auth';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getUser().catch(() => null);
  if (!user) {
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
