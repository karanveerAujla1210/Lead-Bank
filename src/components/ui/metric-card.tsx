import type { ReactNode } from 'react';

const accentStyles = {
  blue: 'border-blue-200/70 bg-blue-50 text-blue-700',
  green: 'border-emerald-200/70 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200/70 bg-amber-50 text-amber-700',
  purple: 'border-violet-200/70 bg-violet-50 text-violet-700',
} as const;

export function MetricCard({
  label,
  value,
  helper,
  icon,
  accent = 'blue',
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
  accent?: keyof typeof accentStyles;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        {icon ? (
          <div className={`rounded-2xl border p-2 ${accentStyles[accent]}`}>
            {icon}
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}
