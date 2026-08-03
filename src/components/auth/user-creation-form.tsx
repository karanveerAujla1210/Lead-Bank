'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'audit_staff', label: 'Audit Staff' },
  { value: 'credit_manager', label: 'Credit Manager' },
  { value: 'operations', label: 'Operations' },
  { value: 'viewer', label: 'Viewer' },
] as const;

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name is required'),
  mobile: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'audit_staff', 'credit_manager', 'operations', 'viewer']),
});

type FormValues = z.infer<typeof schema>;

export function UserCreationForm() {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'viewer' },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    setSuccess('');

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? 'Failed to create user');
      return;
    }

    setSuccess(`User ${payload.profile.email} created with role: ${values.role}`);
    reset();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Create user</h2>
      <p className="mt-2 text-sm text-slate-500">Create a new platform user and assign their access role.</p>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <label className="block text-sm md:col-span-2">
          <span className="mb-2 block text-slate-700">Full name</span>
          <input {...register('full_name')} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Jane Doe" />
          {errors.full_name ? <p className="mt-1 text-sm text-red-500">{errors.full_name.message}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-700">Email</span>
          <input {...register('email')} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="jane@company.com" />
          {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-700">Mobile (optional)</span>
          <input {...register('mobile')} className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="9876543210" />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-700">Password</span>
          <input type="password" {...register('password')} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          {errors.password ? <p className="mt-1 text-sm text-red-500">{errors.password.message}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-700">Role</span>
          <select {...register('role')} className="w-full rounded-xl border border-slate-300 px-3 py-2">
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2">
          <button disabled={loading} className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-white disabled:opacity-70">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Creating...' : 'Create user'}
          </button>
        </div>
      </form>

      {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
    </div>
  );
}
