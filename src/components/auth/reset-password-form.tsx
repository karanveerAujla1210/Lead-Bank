'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    const { error } = await supabase!.auth.updateUser({ password: values.password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.replace('/dashboard');
  };

  return (
    <form className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl" onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Set new password</h2>
        <p className="mt-2 text-sm text-slate-400">Choose a strong password for your account.</p>
      </div>
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-2 block text-slate-300">New password</span>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              {...register('password')}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 pr-10 outline-none"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <p className="mt-1 text-sm text-red-400">{errors.password.message}</p> : null}
        </label>
        <label className="block text-sm">
          <span className="mb-2 block text-slate-300">Confirm password</span>
          <input
            type="password"
            {...register('confirm')}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none"
          />
          {errors.confirm ? <p className="mt-1 text-sm text-red-400">{errors.confirm.message}</p> : null}
        </label>
      </div>
      {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-70"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? 'Updating...' : 'Update password'}
      </button>
    </form>
  );
}
