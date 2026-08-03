import Link from 'next/link';
import { ArrowLeft, FileText, History, ShieldCheck } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="space-y-6 p-6 lg:p-8">
      <Link href="/customers" className="inline-flex items-center text-sm font-medium text-blue-300">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to customers
      </Link>

      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">Customer profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Profile #{id.slice(0, 8)}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Consolidated timeline and document history for this customer, ready for review by operations and credit teams.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Timeline" description="Latest status changes, assignments, and notes">
          <div className="space-y-3">
            {[
              'Lead assigned to operations team',
              'Statement uploaded and queued for analysis',
              'Risk profile updated after transaction review',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <History className="mt-0.5 h-4 w-4 text-blue-500" />
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Documents" description="Statements and onboarding files">
          <div className="space-y-3">
            {[
              'Bank statement • 2026-08-01',
              'PAN card • Verified',
              'Address proof • Pending review',
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 text-blue-500" />
                  {item}
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
