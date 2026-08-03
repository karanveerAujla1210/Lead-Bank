'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UploadCloud, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { ProcessingJob } from '@/lib/intelligence-types';

const customerSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  primary_mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile'),
  primary_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i, 'Enter a valid PAN').optional().or(z.literal('')),
  city: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

const JOB_STATUS_ICONS = {
  queued: <Clock className="h-4 w-4 text-amber-500" />,
  processing: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  retry: <Clock className="h-4 w-4 text-amber-500" />,
  cancelled: <XCircle className="h-4 w-4 text-slate-400" />,
};

export function StatementUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  const pollJob = async (jobId: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/statements/jobs/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      setJob(data);
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        clearInterval(interval);
      }
    }, 3000);
  };

  const onSubmit = async (values: CustomerForm) => {
    if (!file) {
      setError('Please select a bank statement file.');
      return;
    }
    setLoading(true);
    setError('');
    setJob(null);

    try {
      // Step 1: Create or merge customer
      const custRes = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: values.full_name,
          primary_mobile: values.primary_mobile,
          primary_email: values.primary_email || undefined,
          pan: values.pan || undefined,
          city: values.city || undefined,
          source: 'manual',
        }),
      });
      const custPayload = await custRes.json();
      if (!custRes.ok) throw new Error(custPayload.error ?? 'Customer creation failed');
      const cid: string = custPayload.customer.id;
      setCustomerId(cid);

      // Step 2: Upload statement
      const form = new FormData();
      form.append('file', file);
      form.append('customer_id', cid);
      if (bankName) form.append('bank_name', bankName);
      if (password) form.append('password', password);

      const uploadRes = await fetch('/api/statements/upload', { method: 'POST', body: form });
      const uploadPayload = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadPayload.error ?? 'Upload failed');

      // Step 3: Poll job status
      const initialJob: ProcessingJob = {
        id: uploadPayload.job_id,
        statement_id: uploadPayload.statement_id,
        status: 'queued',
        attempts: 0,
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      setJob(initialJob);
      pollJob(uploadPayload.job_id);
      reset();
      setFile(null);
      setPassword('');
      setBankName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Upload Bank Statement</h2>
        <p className="mt-1 text-sm text-slate-500">
          Supports PDF (including password-protected), JPEG, and PNG. Max 50 MB.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700">Full Name *</span>
              <input {...register('full_name')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="Rahul Sharma" />
              {errors.full_name ? <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p> : null}
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700">Mobile *</span>
              <input {...register('primary_mobile')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="9876543210" />
              {errors.primary_mobile ? <p className="mt-1 text-xs text-red-500">{errors.primary_mobile.message}</p> : null}
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700">PAN</span>
              <input {...register('pan')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-400 uppercase" placeholder="ABCDE1234F" />
              {errors.pan ? <p className="mt-1 text-xs text-red-500">{errors.pan.message}</p> : null}
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700">Email</span>
              <input {...register('primary_email')} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="rahul@example.com" />
              {errors.primary_email ? <p className="mt-1 text-xs text-red-500">{errors.primary_email.message}</p> : null}
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700">Bank Name</span>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="HDFC Bank" />
            </label>

            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700">PDF Password (if protected)</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-400" placeholder="Leave blank if not protected" />
            </label>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50">
            <UploadCloud className={`mb-3 h-8 w-8 ${file ? 'text-emerald-500' : 'text-blue-500'}`} />
            <span className="font-medium text-slate-800">
              {file ? file.name : 'Click to select bank statement'}
            </span>
            <span className="mt-1 text-sm text-slate-500">PDF, JPEG, or PNG · Max 50 MB</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {loading ? 'Uploading...' : 'Upload & Process Statement'}
          </button>
        </form>
      </div>

      {job && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Processing Job</h3>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            {JOB_STATUS_ICONS[job.status]}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 capitalize">{job.status}</p>
              <p className="text-xs text-slate-500">Job ID: {job.id}</p>
              {job.error_message ? <p className="mt-1 text-xs text-red-500">{job.error_message}</p> : null}
            </div>
            {customerId && job.status === 'completed' && (
              <a
                href={`/intelligence?q=${customerId}`}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                View Analysis
              </a>
            )}
          </div>
          {job.status === 'queued' || job.status === 'processing' ? (
            <p className="mt-3 text-xs text-slate-400">
              The statement is being processed asynchronously. This page will update automatically.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
