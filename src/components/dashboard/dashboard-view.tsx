"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Upload, Download, LogOut, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Lead, LeadStats } from '@/lib/types';
import { LeadTable } from '@/components/dashboard/lead-table';
import { LeadModal } from '@/components/dashboard/lead-modal';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { UploadDialog } from '@/components/dashboard/upload-dialog';

export function DashboardView({
  stats,
  initialLeads,
  totalCount,
  pageSize,
}: {
  stats: LeadStats;
  initialLeads: Lead[];
  totalCount: number;
  pageSize: number;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [leads, setLeads] = useState(initialLeads);
  const [statsState, setStatsState] = useState(stats);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(totalCount / pageSize)));
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const refreshStats = useCallback(async () => {
    const response = await fetch('/api/stats');
    const payload = await response.json();
    setStatsState(payload);
  }, []);

  const fetchLeads = useCallback(async (nextPage = 1, query = search) => {
    const params = new URLSearchParams({ page: String(nextPage), search: query });
    const response = await fetch(`/api/leads?${params.toString()}`);
    const payload = await response.json();
    setLeads(payload.data ?? []);
    setTotalPages(Math.max(1, Math.ceil((payload.count ?? 0) / pageSize)));
  }, [pageSize, search]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('lead_bank_changes').on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lead_bank' },
      () => {
        fetchLeads(page, search);
        refreshStats();
      },
    );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads, page, refreshStats, search, supabase]);

  const handleSearch = async (value: string) => {
    setSearch(value);
    setPage(1);
    await fetchLeads(1, value);
  };

  const handleExport = () => {
    const rows = leads.map((lead) => ({
      customer_name: lead.customer_name,
      mobile: lead.mobile,
      source: lead.source,
      city: lead.city,
      remarks: lead.remarks,
    }));
    const csv = [
      ['customer_name', 'mobile', 'source', 'city', 'remarks'],
      ...rows.map((row) => [row.customer_name, row.mobile, row.source, row.city, row.remarks]),
    ]
      .map((entry) => entry.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'leads.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-600">Lead Bank</p>
            <h1 className="mt-2 text-3xl font-semibold">Fintech CRM operations</h1>
            <p className="mt-2 text-slate-600">A secure workspace for lead capture, review, and growth.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/intelligence"
              className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-medium text-blue-700 transition hover:bg-blue-100"
            >
              <BarChart3 className="mr-2 h-4 w-4" /> Loan Intelligence
            </a>
            <button onClick={() => setUploadOpen(true)} className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white transition hover:bg-slate-800">
              <Upload className="mr-2 h-4 w-4" /> Upload CSV
            </button>
            <button onClick={() => setSelectedLead({} as Lead)} className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">
              <Plus className="mr-2 h-4 w-4" /> Add lead
            </button>
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Leads', value: statsState.totalLeads },
            { label: "Today's Leads", value: statsState.todaysLeads },
            { label: 'Duplicate Leads', value: statsState.duplicateLeads },
            { label: 'Latest Upload', value: statsState.latestUpload },
          ].map((card) => (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold">Lead bank</h2>
              <p className="mt-1 text-sm text-slate-500">Search, sort, filter, and export your pipeline in seconds.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex items-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Search className="mr-2 h-4 w-4" />
                <input value={search} onChange={(event) => handleSearch(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Search by mobile or name" />
              </label>
              <button onClick={handleExport} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>

          <LeadTable
            leads={leads}
            onEdit={(lead) => setSelectedLead(lead)}
            onDelete={(lead) => setDeleteTarget(lead)}
          />

          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => { setPage((value) => Math.max(1, value - 1)); fetchLeads(page - 1, search); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => { setPage((value) => value + 1); fetchLeads(page + 1, search); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        </section>
      </div>

      <LeadModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onSaved={async () => {
          setSelectedLead(null);
          await fetchLeads(page, search);
          await refreshStats();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        lead={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await fetch(`/api/leads/${deleteTarget.id}`, { method: 'DELETE' });
          setDeleteTarget(null);
          await fetchLeads(page, search);
          await refreshStats();
        }}
      />

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={async () => { setUploadOpen(false); await fetchLeads(page, search); await refreshStats(); }} />
    </div>
  );
}
