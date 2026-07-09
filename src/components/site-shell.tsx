import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { logout } from '@/lib/actions';

const navigation = [
  { href: '/', label: 'Beranda' },
  { href: '/catalog', label: 'Katalog' },
];

export default async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
              L
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">KKN Literasi</p>
              <p className="text-xs text-slate-500">Perpustakaan digital</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100" aria-label="Notifikasi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19a2 2 0 0 0 4 0" />
              </svg>
            </button>

            {user ? (
              <>
                <form action={logout}>
                  <button className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100">
                    Logout
                  </button>
                </form>
                <Link href="/profile" className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <circle cx="12" cy="8" r="3.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
                    </svg>
                  </span>
                  Profil
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500">
                  Masuk
                </Link>
                <Link href="/register" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100">
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full">{children}</main>

      <footer className="border-t border-slate-200 bg-white/80 py-6 text-center text-sm text-slate-600">
        Perpustakaan digital untuk pembaca, pengguna, dan admin.
      </footer>
    </div>
  );
}
