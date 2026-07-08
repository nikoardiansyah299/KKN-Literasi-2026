import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { logout } from '@/lib/actions';

const navigation = [
  {
    href: '/',
    label: 'Beranda',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-6v6H4.5A1.5 1.5 0 0 1 3 21z" />
      </svg>
    ),
  },
  {
    href: '/catalog',
    label: 'Buku',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v18H7.5A2.5 2.5 0 0 1 5 18.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h8" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Peminjaman',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <circle cx="12" cy="8" r="3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
];

export default async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6 lg:py-6">
        <aside className="group w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-300 ease-linear hover:translate-x-1 lg:w-72 lg:shrink-0">
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-600">KKN Literasi 2026</p>
              <Link href="/" className="mt-2 block text-xl font-semibold text-slate-900">Perpustakaan Digital</Link>
              <p className="mt-2 text-sm text-slate-600">Sistem sederhana untuk membaca, meminjam, dan mengelola buku.</p>
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 transition duration-300 ease-linear hover:translate-x-1 hover:bg-slate-100 hover:text-slate-900"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-indigo-600">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-3 rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition duration-300 ease-linear hover:translate-x-1 hover:bg-indigo-700">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M7 7v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6" />
                    </svg>
                  </span>
                  <span>Panel Admin</span>
                </Link>
              )}
            </nav>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <circle cx="12" cy="8" r="3.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Halo, {user.name}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{isAdmin ? 'Admin' : 'Pengguna'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/profile" className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">Profil</Link>
                    <form action={logout}>
                      <button className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Keluar</button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-semibold text-slate-900">Masuk untuk mulai menjelajah</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/login" className="rounded-full bg-indigo-600 px-3 py-2 text-sm font-medium text-white">Masuk</Link>
                    <Link href="/register" className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">Daftar</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <main className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">{children}</main>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white/80 py-6 text-center text-sm text-slate-600">
        Perpustakaan digital untuk pembaca, pengguna, dan admin.
      </footer>
    </div>
  );
}
