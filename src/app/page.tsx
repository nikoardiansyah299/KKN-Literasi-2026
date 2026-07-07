import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 p-8 text-white shadow-xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-100">Shared public experience</p>
        <h1 className="text-4xl font-semibold">Rebuilt library portal for readers and staff</h1>
        <p className="mt-4 max-w-2xl text-lg text-indigo-50">
          Browse an ordered catalog, request loans, reserve unavailable books, and manage inventory with role-based access for users and administrators.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/catalog" className="rounded-full bg-white px-4 py-2 font-medium text-indigo-700">Browse catalog</Link>
          {!user && <Link href="/register" className="rounded-full border border-white/60 px-4 py-2 font-medium">Create account</Link>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Public browsing</h2>
          <p className="mt-2 text-sm text-slate-600">Search, filter, and sort catalog numbers from 000 to 999 with pagination.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">User workflows</h2>
          <p className="mt-2 text-sm text-slate-600">Borrow requests, reservations, history, notifications, and profile management.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Admin controls</h2>
          <p className="mt-2 text-sm text-slate-600">Manage books, review approvals, process returns, and monitor analytics.</p>
        </div>
      </div>
    </section>
  );
}
