'use client';

import { useState } from 'react';
import { Search, Upload, Users, BarChart3, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CustomerSearch } from './customer-search';
import { StatementUpload } from './statement-upload';
import { CustomerList } from './customer-list';

type Tab = 'search' | 'upload' | 'customers';

export function IntelligenceView() {
  const [tab, setTab] = useState<Tab>('search');
  const router = useRouter();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'search', label: 'Intelligence Search', icon: <Search className="h-4 w-4" /> },
    { id: 'upload', label: 'Upload Statement', icon: <Upload className="h-4 w-4" /> },
    { id: 'customers', label: 'Customers', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-600">Loan Intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold">Statement Analysis Platform</h1>
            <p className="mt-2 text-slate-600">Upload bank statements, detect salary, loans, and extract financial intelligence.</p>
          </div>
          <div className="flex gap-3">
            <a href="/dashboard" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">
              <BarChart3 className="mr-2 h-4 w-4" /> Lead Bank
            </a>
            <button
              onClick={async () => {
                document.cookie = 'leadbank_demo_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                await createClient()?.auth.signOut();
                router.replace('/login');
              }}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </button>
          </div>
        </header>

        <nav className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'search' && <CustomerSearch />}
          {tab === 'upload' && <StatementUpload />}
          {tab === 'customers' && <CustomerList />}
        </div>
      </div>
    </div>
  );
}
