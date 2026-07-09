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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
              <img src="/img/logo.jpg" className="h-full w-full object-cover" />
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

      <footer className="border-t border-slate-200 bg-white text-slate-600">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Column 1: Info KKN */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm overflow-hidden">
                  <img src="/img/logo.jpg" className="h-full w-full object-cover" alt="Logo" />
                </div>
                <span className="text-base font-semibold text-slate-900">KKN Literasi 2026</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Program digitalisasi perpustakaan desa untuk meningkatkan minat baca dan mempermudah akses literasi bagi seluruh masyarakat.
              </p>
              <div className="text-sm text-slate-500 space-y-1">
                <p>📍 Kantor Desa Cangkringmalang</p>
                <p>✉️ info@cangkringmalang.desa.id</p>
              </div>
            </div>

            {/* Column 2: Tautan Cepat */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Tautan Cepat</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="hover:text-indigo-600 transition">Beranda</Link>
                </li>
                <li>
                  <Link href="/catalog" className="hover:text-indigo-600 transition">Katalog Buku</Link>
                </li>
                {user ? (
                  <>
                    <li>
                      <Link href="/profile" className="hover:text-indigo-600 transition">Profil Saya</Link>
                    </li>
                    <li>
                      <Link href="/dashboard" className="hover:text-indigo-600 transition">Dashboard Peminjaman</Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link href="/login" className="hover:text-indigo-600 transition">Masuk</Link>
                    </li>
                    <li>
                      <Link href="/register" className="hover:text-indigo-600 transition">Daftar</Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Column 3: Jam Layanan & Informasi */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Layanan Perpustakaan</h3>
              <div className="text-sm text-slate-500 space-y-3">
                <div>
                  <p className="font-medium text-slate-800">Senin - Jumat:</p>
                  <p className="text-xs text-slate-500">08:00 - 15:00 WIB</p>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Sabtu:</p>
                  <p className="text-xs text-slate-500">09:00 - 12:00 WIB</p>
                </div>
                <p className="text-xs border-l-2 border-indigo-500 pl-2 py-0.5">
                  Peminjaman online dapat dilakukan kapan saja melalui katalog digital.
                </p>
              </div>
            </div>

            {/* Column 4: Google Maps */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Lokasi Kami</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-slate-50">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d247.18693813507187!2d112.73065080079769!3d-7.575956260345895!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7dd5d243b4285%3A0xcbf273dc82139d97!2sKantor%20Desa%20Cangkringmalang!5e0!3m2!1sid!2sid!4v1783583351551!5m2!1sid!2sid"
                  width="100%"
                  height="160"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Lokasi Kantor Desa Cangkringmalang"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            <p>© {new Date().getFullYear()} KKN Literasi Perpustakaan Digital. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
