import { Pencil, Trash2 } from 'lucide-react';
import type { Lead } from '@/lib/types';

export function LeadTable({
  leads,
  onEdit,
  onDelete,
}: {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Mobile</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Source</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">City</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Remarks</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{lead.customer_name}</td>
              <td className="px-4 py-3 text-slate-700">{lead.mobile}</td>
              <td className="px-4 py-3 text-slate-700">{lead.source}</td>
              <td className="px-4 py-3 text-slate-700">{lead.city}</td>
              <td className="px-4 py-3 text-slate-700">{lead.remarks}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button onClick={() => onEdit(lead)} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => onDelete(lead)} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
