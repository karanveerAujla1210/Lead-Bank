"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError('');

    if (!supabase) {
      setError('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  };

  return (
    <form className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl" onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-400">Access your secure lead workspace.</p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="mb-2 block text-slate-300">Email</span>
          <input
            {...register('email')}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none ring-0"
            placeholder="ops@leadbank.com"
          />
          {errors.email ? <p className="mt-1 text-sm text-red-400">{errors.email.message}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-2 block text-slate-300">Password</span>
          <input
            type="password"
            {...register('password')}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none ring-0"
            placeholder="********"
          />
          {errors.password ? <p className="mt-1 text-sm text-red-400">{errors.password.message}</p> : null}
        </label>
      </div>

      {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-slate-400 hover:text-white">Forgot password?</Link>
        <Link href="/mfa" className="text-slate-400 hover:text-white">Setup MFA</Link>
      </div>
    </form>
  );
}
