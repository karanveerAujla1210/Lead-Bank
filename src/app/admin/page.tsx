import { UserCreationForm } from '@/components/auth/user-creation-form';

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-600">Admin panel</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">User management</h1>
          <p className="mt-2 text-slate-600">Create new users and assign roles for your Lead Bank access.</p>
        </div>
        <UserCreationForm />
      </div>
    </main>
  );
}
