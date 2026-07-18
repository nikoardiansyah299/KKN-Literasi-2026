import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import NavbarClient from '@/components/navbar-client';

export default async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <NavbarClient user={user} />

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
                Website TBM dibuat oleh KKN Literasi 2026 untuk meningkatkan minat baca dan mempermudah akses literasi bagi seluruh masyarakat.
              </p>
              <div className="text-sm text-slate-500 space-y-1">
                <p>📍 TBM Dewi Kencana</p>
                <p>✉️ </p>
              </div>
            </div>

            {/* Column 2: Tautan Cepat */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Tautan Cepat</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/">Beranda</Link>
                </li>
                <li>
                  <Link href="/catalog">Katalog Buku</Link>
                </li>
                {user ? (
                  <>
                    <li>
                      <Link href="/profile">Profil Saya</Link>
                    </li>
                    <li>
                      <Link href="/dashboard">Dashboard Peminjaman</Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link href="/login">Masuk</Link>
                    </li>
                    <li>
                      <Link href="/register">Daftar</Link>
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
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15820.012226321584!2d112.73259347304686!3d-7.574644011213139!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7dd0079abf8b7%3A0x1a00bf87d6cf98b5!2sTBM%20Dewi%20Kencana!5e0!3m2!1sid!2sid!4v1784291615828!5m2!1sid!2sid"
                  width="100%"
                  height="160"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Lokasi TBM Dewi Kencana"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            <p>© {new Date().getFullYear()} KKN Literasi TBM Dewi Kencana. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
