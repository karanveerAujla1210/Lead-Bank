'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { CustomerIntelligence } from '@/lib/intelligence-types';
import { CustomerIntelligenceCard } from './customer-intelligence-card';

export function CustomerSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerIntelligence[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);

    try {
      const params = new URLSearchParams();
      const isPan = /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(query.trim());
      const isMobile = /^[6-9]\d{9}$/.test(query.replace(/\D/g, '').slice(-10));

      if (isPan) params.set('pan', query.trim().toUpperCase());
      else if (isMobile) params.set('mobile', query.replace(/\D/g, '').slice(-10));
      else params.set('q', query.trim());

      const res = await fetch(`/api/customers/search?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Search failed');
      setResults(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Customer Intelligence Lookup</h2>
        <p className="mt-1 text-sm text-slate-500">Search by PAN, mobile number, or customer name to get full financial intelligence.</p>

        <form onSubmit={handleSearch} className="mt-4 flex gap-3">
          <div className="flex flex-1 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Enter PAN (ABCDE1234F), mobile (9876543210), or name"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}
      </div>

      {searched && results.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">No customers found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {results.map((customer) => (
        <CustomerIntelligenceCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
