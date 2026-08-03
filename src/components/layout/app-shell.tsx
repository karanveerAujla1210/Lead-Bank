'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, FileText, LayoutDashboard, Menu, Settings2, ShieldCheck, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/intelligence', label: 'Intelligence', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings2 },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        toast.info('Session ended. Please sign in again.');
        router.replace('/login');
      }
      if (event === 'TOKEN_REFRESHED') {
        toast.success('Session refreshed', { duration: 2000 });
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (pathname === '/login' || pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/95 p-6 lg:flex lg:flex-col">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">Lead Bank</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Operations suite</h1>
          </div>

          <nav className="mt-8 space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? 'bg-blue-500/15 text-blue-200 shadow-sm' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">Production-safe workflows</p>
            <p className="mt-2 text-sm text-slate-400">Responsive UI, route guards, and Supabase-backed operations built in.</p>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-white/10 bg-slate-900/70 px-4 py-4 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-blue-300">Lead Bank</p>
                <p className="text-sm text-slate-400">Operations suite</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="rounded-xl border border-white/10 p-2 text-slate-200"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
            {mobileOpen ? (
              <nav className="mt-4 space-y-1">
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center rounded-2xl px-3 py-2.5 text-sm font-medium ${
                        active ? 'bg-blue-500/15 text-blue-200' : 'text-slate-300'
                      }`}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </header>

          <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_48%)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
