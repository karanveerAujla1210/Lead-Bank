'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['superadmin', 'user']),
});

type FormValues = z.infer<typeof schema>;

export function UserCreationForm() {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'user' } });

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

    setSuccess(`User ${payload.user.email} created as ${payload.user.user_metadata?.role ?? 'user'}`);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Create user</h2>
      <p className="mt-2 text-sm text-slate-500">Create a new Supabase user account with roles for your team.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block text-sm">
          <span className="mb-2 block text-slate-700">Email</span>
          <input {...register('email')} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          {errors.email ? <p className="mt-1 text-sm text-red-500">{errors.email.message}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-700">Password</span>
          <input type="password" {...register('password')} className="w-full rounded-xl border border-slate-300 px-3 py-2" />
          {errors.password ? <p className="mt-1 text-sm text-red-500">{errors.password.message}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-700">Role</span>
          <select {...register('role')} className="w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="user">User</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </label>

        <button disabled={loading} className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-white disabled:opacity-70">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Creating...' : 'Create user'}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}
