'use client';

import { cn } from '@/lib/utils';

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
            active === t.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
