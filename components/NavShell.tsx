'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/utils';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/issues', label: 'Top Issues' },
  { href: '/executions', label: 'Executions' },
  { href: '/inspect/indexes', label: 'Index Inspector' },
  { href: '/tuning/queries', label: 'Query Tuner' },
  { href: '/advisors/partitioning', label: 'Partitioning Advisor' },
  { href: '/settings', label: 'Settings' }
];

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 flex-col bg-slate-900/80 p-6 lg:flex">
        <div className="text-xl font-semibold">AI DBA Assistant</div>
        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('block rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800', active && 'bg-blue-600 text-white')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
