import { Building2, KeyRound, ShieldCheck, Users2 } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionCard } from '@/components/ui/section-card';

export default function SettingsPage() {
  return (
    <main className="space-y-6 p-6 lg:p-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Platform settings, roles, and permissions</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Configure company policies, permissions, and integrations from a single management surface.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Users" value="18" helper="Managed through Supabase auth" icon={<Users2 className="h-5 w-5" />} accent="blue" />
        <MetricCard label="Roles" value="6" helper="RBAC ready" icon={<ShieldCheck className="h-5 w-5" />} accent="green" />
        <MetricCard label="API keys" value="3" helper="Masked in the UI" icon={<KeyRound className="h-5 w-5" />} accent="purple" />
      </div>

      <SectionCard title="Company profile" description="Organization setup and operational controls">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Building2 className="h-4 w-4 text-blue-500" />
              <p className="font-semibold">Company information</p>
            </div>
            <p className="mt-3 text-sm text-slate-600">Lead Bank Finance • Mumbai • India</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="font-semibold text-slate-900">Security posture</p>
            <p className="mt-3 text-sm text-slate-600">Signed URLs, role checks, and audit logging are enabled for sensitive operations.</p>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
