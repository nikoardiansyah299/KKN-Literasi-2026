'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthUser } from '@/lib/auth';
import { logout } from '@/lib/actions';

interface NavbarClientProps {
  user: AuthUser;
}

const navigation = [
  { href: '/', label: 'Beranda' },
  { href: '/catalog', label: 'Katalog' },
];

export default function NavbarClient({ user }: NavbarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on pathname change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Disable body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-semibold text-white shadow-sm overflow-hidden">
              <img src="/img/logo.jpg" className="h-full w-full object-cover" alt="Logo KKN Literasi" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">KKN Literasi</p>
              <p className="text-xs text-slate-500">Perpustakaan digital</p>
            </div>
          </Link>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none cursor-pointer"
            aria-label="Buka Menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Left-sliding Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-full bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm overflow-hidden">
                <img src="/img/logo.jpg" className="h-full w-full object-cover" alt="Logo KKN Literasi" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">KKN Literasi</p>
                <p className="text-xs text-slate-500">Perpustakaan digital</p>
              </div>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-500 transition hover:bg-slate-100 cursor-pointer"
              aria-label="Tutup Menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2 py-6">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  pathname === item.href
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Actions & Session buttons */}
          <div className="mt-auto border-t border-slate-100 pt-6 space-y-4">
            {/* Notification Button */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notifikasi</span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 cursor-pointer"
                aria-label="Notifikasi"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19a2 2 0 0 0 4 0" />
                </svg>
              </button>
            </div>

            {user ? (
              <div className="space-y-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                      <circle cx="12" cy="8" r="3.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
                    </svg>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-xs text-left truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 text-left capitalize truncate">{isAdmin ? 'Admin' : 'Profil Saya'}</p>
                  </div>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Panel Admin
                  </Link>
                )}
                {!isAdmin && (
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-100"
                  >
                    Dashboard Peminjaman
                  </Link>
                )}
                <form action={logout}>
                  <button type="submit" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 cursor-pointer">
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  className="flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
