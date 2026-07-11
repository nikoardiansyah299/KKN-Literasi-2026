import { register } from '@/lib/actions';
import Link from 'next/link';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params?.error;

  const errorMessages: Record<string, string> = {
    invalid: 'Nama, email, dan password (min. 6 karakter) wajib diisi.',
    exists: 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.',
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Buat Akun Baru</h1>
            <p className="mt-1 text-sm text-slate-500">Daftarkan diri sebagai anggota perpustakaan</p>
          </div>

          {/* Error Banner */}
          {error && errorMessages[error] && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessages[error]}
            </div>
          )}

          {/* Google Sign-Up Button */}
          <a
            href="/api/auth/google"
            id="google-register-btn"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Daftar dengan Google
          </a>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <hr className="flex-1 border-slate-200" />
            <span className="text-xs text-slate-400">atau daftar dengan email</span>
            <hr className="flex-1 border-slate-200" />
          </div>

          {/* Registration Form */}
          <form action={register} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="mb-1 block text-xs font-medium text-slate-600">
                Nama Lengkap
              </label>
              <input
                id="register-name"
                name="name"
                placeholder="Nama Lengkap Anda"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            <div>
              <label htmlFor="register-email" className="mb-1 block text-xs font-medium text-slate-600">
                Email
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>
            <div>
              <label htmlFor="register-password" className="mb-1 block text-xs font-medium text-slate-600">
                Password
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                placeholder="Min. 6 karakter"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
                minLength={6}
              />
            </div>
            <button
              id="register-submit-btn"
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
            >
              Buat Akun
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
