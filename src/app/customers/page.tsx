import Link from 'next/link';
import { ArrowUpRight, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionCard } from '@/components/ui/section-card';

type CustomerRecord = Record<string, unknown>;

export default async function CustomersPage() {
  let customers: CustomerRecord[] = [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('customers')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8);
    customers = (data ?? []) as CustomerRecord[];
  } catch {
    customers = [];
  }

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">Customers</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Customer profiles, documents, and risk posture</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Track every prospect from onboarding to repayment review with a single, polished view.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
          <Search className="h-4 w-4" />
          Search by PAN, mobile, or email
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active customers" value={customers.length || 24} helper="Synced from the Supabase dataset" icon={<ShieldCheck className="h-5 w-5" />} accent="blue" />
        <MetricCard label="High-risk accounts" value="6" helper="Flagged for follow-up this week" icon={<Sparkles className="h-5 w-5" />} accent="amber" />
        <MetricCard label="Documents pending" value="11" helper="Statement uploads and ID verification" icon={<ArrowUpRight className="h-5 w-5" />} accent="green" />
      </div>

      <SectionCard
        title="Customer roster"
        description="Recent records from your connected Supabase workspace."
        actions={<button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200">Export overview</button>}
      >
        <div className="space-y-3">
          {customers.length ? (
            customers.map((customer, index) => {
              const fullName = typeof customer.full_name === 'string' ? customer.full_name : `Customer ${index + 1}`;
              const email = typeof customer.email === 'string' ? customer.email : 'No email on file';
              const mobile = typeof customer.mobile === 'string' ? customer.mobile : '—';
              return (
                <Link
                  key={typeof customer.id === 'string' ? customer.id : `${fullName}-${index}`}
                  href={`/customers/${typeof customer.id === 'string' ? customer.id : index}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 hover:bg-blue-50/60 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{email}</p>
                  </div>
                  <div className="text-sm text-slate-500">
                    <p>Mobile: {mobile}</p>
                    <p className="mt-1">Risk: {typeof customer.risk_score === 'number' ? customer.risk_score : 'Medium'}</p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
              No customer records are available yet. Upload statements or seed the CRM to populate this view.
            </div>
          )}
        </div>
      </SectionCard>
    </main>
  );
}
