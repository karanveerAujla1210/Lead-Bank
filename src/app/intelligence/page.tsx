import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/auth';
import { IntelligenceView } from '@/components/intelligence/intelligence-view';

export const dynamic = 'force-dynamic';

export default async function IntelligencePage() {
  const user = await getUser().catch(() => null);
  if (!user) redirect('/login');
  return <IntelligenceView />;
}
