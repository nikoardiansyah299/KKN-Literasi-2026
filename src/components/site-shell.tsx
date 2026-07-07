import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { logout } from '@/lib/actions';

const links = [
  { href: '/', label: 'Home' },
  { href: '/catalog', label: 'Catalog' },
];

export default async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">KKN Literasi 2026</p>
            <Link href="/" className="text-xl font-semibold">Library Catalog Portal</Link>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full px-3 py-2 transition hover:bg-slate-100">
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="rounded-full bg-indigo-600 px-3 py-2 text-white">
                  {user.role === 'admin' ? 'Admin' : 'Dashboard'}
                </Link>
                <Link href="/profile" className="rounded-full px-3 py-2 hover:bg-slate-100">Profile</Link>
                <form action={logout}><button className="rounded-full border border-slate-300 px-3 py-2 hover:bg-slate-100">Logout</button></form>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-2 hover:bg-slate-100">Login</Link>
                <Link href="/register" className="rounded-full bg-slate-900 px-3 py-2 text-white">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white/80 py-6 text-center text-sm text-slate-600">
        Built for shared public browsing, user borrowing, and admin inventory workflows.
      </footer>
    </div>
  );
}
