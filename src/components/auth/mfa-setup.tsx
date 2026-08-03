'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Copy, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Step = 'enroll' | 'verify' | 'done';

export function MfaSetup() {
  const [step, setStep] = useState<Step>('enroll');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const enroll = async () => {
      if (!supabase) return;
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'LeadBank' });
      setLoading(false);
      if (error || !data) { setError(error?.message ?? 'Enrollment failed'); return; }
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    };
    enroll();
  }, [supabase]);

  const verify = async () => {
    if (!supabase || !factorId || code.length !== 6) return;
    setLoading(true);
    setError('');
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
    if (!challenge) { setError('Challenge failed'); setLoading(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    setLoading(false);
    if (error) { setError(error.message); return; }
    toast.success('MFA enabled successfully');
    setStep('done');
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle className="h-10 w-10 text-emerald-600" />
        <p className="font-semibold text-emerald-800">MFA is now active</p>
        <p className="text-sm text-emerald-700">Your account is protected with two-factor authentication.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Two-Factor Authentication</h2>
          <p className="text-sm text-slate-500">Scan the QR code with your authenticator app, then enter the 6-digit code.</p>
        </div>
      </div>

      {loading && !qr ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {qr ? (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="MFA QR Code" className="h-48 w-48 rounded-xl border border-slate-200 p-2" />
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <code className="text-xs text-slate-700 break-all">{secret}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(secret); toast.success('Secret copied'); }}
                  className="shrink-0 text-slate-400 hover:text-slate-700"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-slate-700">Enter 6-digit code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-center text-2xl tracking-[0.5em] outline-none focus:border-blue-400"
                placeholder="000000"
                maxLength={6}
              />
            </label>
            {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
            <button
              onClick={verify}
              disabled={loading || code.length !== 6}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Verifying...' : 'Enable MFA'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
