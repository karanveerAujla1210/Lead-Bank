'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    const { error } = await supabase!.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-600" />
        <p className="font-semibold text-emerald-800">Check your email</p>
        <p className="text-sm text-emerald-700">We sent a password reset link. Check your inbox and follow the instructions.</p>
        <Link href="/login" className="mt-2 text-sm font-medium text-emerald-700 underline">Back to login</Link>
      </div>
    );
  }

  return (
    <form className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl" onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Forgot password</h2>
        <p className="mt-2 text-sm text-slate-400">Enter your email and we'll send a reset link.</p>
      </div>
      <label className="block text-sm">
        <span className="mb-2 block text-slate-300">Email</span>
        <input
          {...register('email')}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none"
          placeholder="ops@leadbank.com"
        />
        {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email.message}</p> : null}
      </label>
      {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-70"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? 'Sending...' : 'Send reset link'}
      </button>
      <Link href="/login" className="mt-4 flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to login
      </Link>
    </form>
  );
}
