import { MfaSetup } from '@/components/auth/mfa-setup';

export default function MfaPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_45%)] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Lead Bank CRM
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Secure your account</h1>
          <p className="mt-2 text-slate-600">Enable two-factor authentication for extra security.</p>
        </div>
        <MfaSetup />
      </div>
    </main>
  );
}
