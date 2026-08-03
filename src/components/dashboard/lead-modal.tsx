"use client";

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import type { Lead } from '@/lib/types';

const schema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  source: z.string().min(2, 'Source is required'),
  city: z.string().min(2, 'City is required'),
  remarks: z.string().min(2, 'Remarks are required'),
});

type FormValues = z.infer<typeof schema>;

export function LeadModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (lead) {
      reset({
        customer_name: lead.customer_name,
        mobile: lead.mobile,
        source: lead.source ?? '',
        city: lead.city ?? '',
        remarks: lead.remarks ?? '',
      });
    }
  }, [lead, reset]);

  if (!lead) return null;

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    const method = lead.id ? 'PATCH' : 'POST';
    const endpoint = lead.id ? `/api/leads/${lead.id}` : '/api/leads';
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    setLoading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Unable to save lead');
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{lead.id ? 'Edit lead' : 'Add lead'}</h3>
            <p className="mt-1 text-sm text-slate-500">Validate details before saving to the bank.</p>
          </div>
          <button onClick={onClose} className="text-sm font-medium text-slate-500">Close</button>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">Customer name</span>
            <input {...register('customer_name')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none" />
            {errors.customer_name ? <p className="mt-1 text-sm text-red-600">{errors.customer_name.message}</p> : null}
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Mobile</span>
            <input {...register('mobile')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none" />
            {errors.mobile ? <p className="mt-1 text-sm text-red-600">{errors.mobile.message}</p> : null}
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">Source</span>
            <input {...register('source')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none" />
            {errors.source ? <p className="mt-1 text-sm text-red-600">{errors.source.message}</p> : null}
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-700">City</span>
            <input {...register('city')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none" />
            {errors.city ? <p className="mt-1 text-sm text-red-600">{errors.city.message}</p> : null}
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700">Remarks</span>
            <textarea {...register('remarks')} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none" />
            {errors.remarks ? <p className="mt-1 text-sm text-red-600">{errors.remarks.message}</p> : null}
          </label>
          {error ? <p className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Save lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
