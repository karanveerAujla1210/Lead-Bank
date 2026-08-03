"use client";

import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { LeadInput } from '@/lib/types';

function normalizeRecord(row: Record<string, string | undefined>): LeadInput {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/\s+/g, '_'), value]),
  );

  const customer_name = String(
    normalizedRow.customer_name ??
    normalizedRow.customername ??
    normalizedRow.name ??
    normalizedRow.fullname ??
    normalizedRow.full_name ??
    normalizedRow.customer ??
    normalizedRow.client_name ??
    '',
  ).trim();
  const mobile = String(
    normalizedRow.mobile ??
    normalizedRow.phone ??
    normalizedRow.phone_number ??
    normalizedRow.contact ??
    normalizedRow.contact_number ??
    '',
  ).trim();
  const source = String(normalizedRow.source ?? normalizedRow.lead_source ?? '').trim();
  const city = String(normalizedRow.city ?? normalizedRow.location ?? normalizedRow.town ?? '').trim();
  const remarks = String(normalizedRow.remarks ?? normalizedRow.notes ?? normalizedRow.comment ?? '').trim();
  return { customer_name, mobile, source, city, remarks };
}

function sanitizeMobile(value: string) {
  return value.replace(/\D/g, '').replace(/^91/, '').slice(-10);
}

async function parseUploadFile(file: File) {
  if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
  }

  return await new Promise<Record<string, string>[]>((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      fastMode: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => resolve(results.data ?? []),
    });
  });
}

export function UploadDialog({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ inserted: number; duplicates: number; invalid: number } | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setSummary(null);

    try {
      const records = await parseUploadFile(file);
      const normalizedRecords = records.map((row) => normalizeRecord(row as Record<string, string | undefined>));
      const validRecords: LeadInput[] = [];
      const duplicates = new Set<string>();
      let invalid = 0;

      for (const record of normalizedRecords) {
        const normalizedMobile = sanitizeMobile(record.mobile);
        if (!record.customer_name || normalizedMobile.length !== 10) {
          invalid += 1;
          continue;
        }

        const uniqueKey = `${record.customer_name.toLowerCase()}-${normalizedMobile}`;
        if (duplicates.has(uniqueKey)) {
          invalid += 1;
          continue;
        }
        duplicates.add(uniqueKey);
        validRecords.push({ ...record, mobile: normalizedMobile });
      }

      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: validRecords, invalid }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Import failed');

      setSummary({ inserted: payload.inserted ?? 0, duplicates: payload.duplicates ?? 0, invalid: payload.invalid ?? 0 });
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Upload leads</h3>
            <p className="mt-1 text-sm text-slate-500">CSV or Excel files are supported. Duplicates and invalid numbers are skipped.</p>
          </div>
          <button onClick={onClose} className="text-sm font-medium text-slate-500">Close</button>
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <UploadCloud className="mb-3 h-8 w-8 text-blue-600" />
          <span className="font-medium text-slate-800">Click to upload a CSV or Excel file</span>
          <span className="mt-1 text-sm text-slate-500">Expected columns: customer name, mobile, source, city, remarks</span>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
        </label>
        {loading ? <p className="mt-4 text-sm text-slate-600">Processing file…</p> : null}
        {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
        {summary ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <p><strong>Inserted:</strong> {summary.inserted}</p>
            <p><strong>Duplicates:</strong> {summary.duplicates}</p>
            <p><strong>Invalid:</strong> {summary.invalid}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
