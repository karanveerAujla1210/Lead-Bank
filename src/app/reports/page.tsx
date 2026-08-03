import { Download, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionCard } from '@/components/ui/section-card';

export default function ReportsPage() {
  return (
    <main className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">Reports</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Executive reporting, exports, and insights</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Generate polished PDF and Excel reports designed for the operations and leadership teams.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200">
            <FileText className="mr-2 h-4 w-4" /> PDF
          </button>
          <button className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Conversion rate" value="18.4%" helper="Up 2.2% this month" icon={<TrendingUp className="h-5 w-5" />} accent="green" />
        <MetricCard label="Pending approvals" value="24" helper="Operations queue" icon={<Download className="h-5 w-5" />} accent="amber" />
        <MetricCard label="Avg. turnaround" value="3.1d" helper="Across all leads" icon={<FileText className="h-5 w-5" />} accent="purple" />
      </div>

      <SectionCard title="Weekly performance" description="Key charts and tables for leadership review">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Lead acquisition</p>
            <div className="mt-4 h-32 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Risk distribution</p>
            <div className="mt-4 h-32 rounded-2xl bg-gradient-to-r from-emerald-400 to-amber-400" />
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
