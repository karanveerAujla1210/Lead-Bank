"use client";

import type { Lead } from '@/lib/types';

export function ConfirmDialog({
  open,
  lead,
  onClose,
  onConfirm,
}: {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-semibold text-slate-900">Delete lead?</h3>
        <p className="mt-2 text-sm text-slate-600">
          This will soft-delete {lead.customer_name} from the lead bank. You can restore via the database if needed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</button>
          <button onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white">Delete</button>
        </div>
      </div>
    </div>
  );
}
