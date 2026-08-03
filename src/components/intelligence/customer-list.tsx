'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import type { Customer } from '@/lib/intelligence-types';

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchCustomers = useCallback(async (searchQuery: string, cursorValue: string | null, append = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (searchQuery) params.set('search', searchQuery);
      if (cursorValue) params.set('cursor', cursorValue);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Failed to load customers');

      setCustomers((prev) => append ? [...prev, ...(payload.data ?? [])] : (payload.data ?? []));
      setNextCursor(payload.next_cursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers('', null);
  }, [fetchCustomers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCursor(null);
    fetchCustomers(value, null);
  };

  const loadMore = () => {
    if (!nextCursor) return;
    setCursor(nextCursor);
    fetchCustomers(search, nextCursor, true);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">All Customers</h2>
          <p className="mt-1 text-sm text-slate-500">Browse and search all customers in the platform.</p>
        </div>
        <label className="flex items-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-transparent outline-none"
            placeholder="Search by name, mobile, email"
          />
        </label>
      </div>

      {error ? (
        <p className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="divide-y divide-slate-100">
        {customers.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">
                {c.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{c.full_name}</p>
                <p className="text-xs text-slate-500">{c.customer_code} · {c.primary_mobile ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-400 sm:block">{c.city ?? '—'}</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500 capitalize">{c.source}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </div>
        ))}

        {customers.length === 0 && !loading && (
          <p className="px-6 py-8 text-center text-sm text-slate-400">No customers found.</p>
        )}
      </div>

      <div className="flex items-center justify-center p-4">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : nextCursor ? (
          <button onClick={loadMore} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Load more
          </button>
        ) : customers.length > 0 ? (
          <p className="text-xs text-slate-400">All customers loaded</p>
        ) : null}
      </div>
    </div>
  );
}
