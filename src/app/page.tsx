import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import BookCarousel from '@/components/book-carousel';

export default async function HomePage() {
  const user = await getSessionUser();
  const isAdmin = user?.role === 'admin';

  const highlights = [
    {
      title: 'Akses gratis dan terbuka',
      description: 'Semua pengguna bisa menjelajah katalog, membaca informasi buku, dan memulai peminjaman tanpa hambatan.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      ),
    },
    {
      title: 'Peminjaman yang rapi',
      description: 'Status peminjaman terlihat jelas, sehingga pembaca dan admin bisa mengelola kebutuhan dengan lebih aman.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M3 10h18" />
        </svg>
      ),
    },
    {
      title: 'Tampilan yang nyaman',
      description: 'Antarmuka yang bersih membantu pengguna fokus pada konten dan menemukan buku dengan cepat.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 13h5" />
        </svg>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="w-full">
        <div className="relative isolate overflow-hidden rounded-none border border-slate-200 bg-slate-900 text-white shadow-sm">
          <div className="absolute inset-0">
            <img src="/img/homepage1.jpg" alt="Perpustakaan dengan suasana belajar" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-slate-950/60" />
          </div>
          <div className="relative min-h-[420px] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-50">
            <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-100">Selamat datang</p>
                <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Temukan buku, kelola peminjaman, dan nikmati pengalaman membaca yang tenang.</h1>
                <p className="mt-4 max-w-xl text-base text-indigo-50/90">
                  Perpustakaan digital gratis ini mempermudah pembaca menjelajah koleksi, melihat status peminjaman, dan mengakses fitur yang sesuai dengan akun mereka.
                </p>
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                  <Link href="/catalog" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Lihat buku</Link>
                  {!user ? (
                    <>
                      <Link href="/login" className="rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-white">Masuk</Link>
                      <Link href="/register" className="rounded-full bg-slate-950/30 px-4 py-2 text-sm font-medium text-white">Daftar</Link>
                    </>
                  ) : (
                    <Link href={isAdmin ? '/admin' : '/dashboard'} className="rounded-full border border-white/40 px-4 py-2 text-sm font-medium text-white">
                      {isAdmin ? 'Buka panel admin' : 'Lihat peminjaman'}
                    </Link>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/20 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">Pencarian judul buku</span>
                  <span className="text-sm font-medium text-white/75">Gratis untuk dipinjam</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/15 bg-slate-900/40 p-3">
                    <form action="/catalog" className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <label htmlFor="home-search" className="sr-only">Cari buku</label>
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
                          </svg>
                        </span>
                        <input
                          id="home-search"
                          name="search"
                          type="search"
                          placeholder="Cari judul atau pengarang"
                          className="h-12 w-full rounded-full border border-white/30 bg-white/95 pl-11 pr-4 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <button type="submit" className="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-medium text-white transition hover:bg-indigo-500">
                        Cari
                      </button>
                    </form>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                      <p className="text-xs text-white/70">Buku tersedia</p>
                      <p className="mt-1 text-lg font-semibold text-white">120+</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                      <p className="text-xs text-white/70">Akses cepat</p>
                      <p className="mt-1 text-lg font-semibold text-white">24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative py-10">
        {/* Background image – below hero, above footer (seamless tile) */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: 'url(/img/background.jpg)',
            backgroundRepeat: 'repeat',
            backgroundSize: '700px',
            opacity: 0.2,  
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 6v12m10-12v12M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Keunggulan perpustakaan gratis ini</p>
              <p className="text-sm text-slate-600">Desain sederhana untuk pengalaman membaca yang lebih nyaman.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                  {item.icon}
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrolling Book Catalog ── */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 rounded-3xl border border-slate-100">
          <BookCarousel />
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 p-8 shadow-sm">
          <div className="absolute inset-0">
            <img src="/img/homepage2.jpg" alt="Keunggulan perpustakaan digital" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/60" />
          </div>
          <div className="relative text-white text-center flex flex-col items-center max-w-3xl mx-auto py-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-100">Siap mulai?</p>
            <h2 className="mt-2 text-3xl font-semibold">Jadikan membaca sebagai kebiasaan yang menyenangkan.</h2>
            <p className="mt-3 text-sm text-slate-200">Masuk untuk melihat riwayat peminjaman, atau jelajahi katalog buku terlebih dahulu sebagai tamu.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
              <Link href="/catalog" className="flex items-center justify-between gap-4 rounded-2xl bg-indigo-600! hover:bg-indigo-700! px-4 py-3 text-sm font-medium text-white! shadow-sm transition w-full sm:w-auto">
                <span>Jelajahi katalog buku</span>
                <span className="text-white">→</span>
              </Link>
              <Link href={user ? (isAdmin ? '/admin' : '/dashboard') : '/login'} className="flex items-center justify-between gap-4 rounded-2xl border border-white/30 bg-slate-950/30 px-4 py-3 text-sm font-medium text-white shadow-sm backdrop-blur transition hover:bg-white/10 w-full sm:w-auto">
                <span>{user ? (isAdmin ? 'Buka panel admin' : 'Lihat peminjaman') : 'Masuk ke akun'}</span>
                <span className="text-indigo-200">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
