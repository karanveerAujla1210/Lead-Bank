import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_45%)] px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur lg:flex-row lg:items-center lg:p-12">
        <div className="flex-1 space-y-5">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            Lead Bank CRM
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Reset your password</h1>
            <p className="max-w-xl text-lg text-slate-600">
              Enter your registered email and we'll send a secure reset link.
            </p>
          </div>
        </div>
        <div className="flex-1">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
