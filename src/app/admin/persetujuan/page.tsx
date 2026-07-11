import Link from 'next/link';
import { getPersetujuanData } from '@/lib/data';
import { approveBorrowRequest, rejectBorrowRequest, createOfflineLoan } from '@/lib/actions';

export default async function PersetujuanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status || 'pending';

  const data = await getPersetujuanData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Hanya administrator yang dapat mengakses area ini.
        </div>
      </div>
    );
  }

  const { requests, books } = data;

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  const countPending = requests.filter((r) => r.status === 'pending').length;
  const countApproved = requests.filter((r) => r.status === 'approved').length;
  const countRejected = requests.filter((r) => r.status === 'rejected').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);
  const defaultDueStr = defaultDue.toISOString().split('T')[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 mb-1">Admin Panel</p>
          <h1 className="text-2xl font-bold text-slate-900">Persetujuan & Peminjaman</h1>
          <p className="mt-1 text-xs text-slate-500">
            Kelola pengajuan peminjaman buku digital dari warga desa, atau catat peminjaman offline.
          </p>
        </div>
        <Link
          href="/admin"
          className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition text-center shrink-0 cursor-pointer"
        >
          ← Kembali
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Borrow Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span>Daftar Pengajuan</span>
                {countPending > 0 && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                    {countPending}
                  </span>
                )}
              </h2>

              {/* Tabs */}
              <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
                <Link
                  href="/admin/persetujuan?status=pending"
                  className={`rounded-full px-3 py-1 transition ${
                    statusFilter === 'pending'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Menunggu ({countPending})
                </Link>
                <Link
                  href="/admin/persetujuan?status=approved"
                  className={`rounded-full px-3 py-1 transition ${
                    statusFilter === 'approved'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Disetujui ({countApproved})
                </Link>
                <Link
                  href="/admin/persetujuan?status=rejected"
                  className={`rounded-full px-3 py-1 transition ${
                    statusFilter === 'rejected'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ditolak ({countRejected})
                </Link>
                <Link
                  href="/admin/persetujuan?status=all"
                  className={`rounded-full px-3 py-1 transition ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({requests.length})
                </Link>
              </div>
            </div>

            {/* List */}
            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Tidak ada pengajuan peminjaman dengan status ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
                {filteredRequests.map((request) => (
                  <div key={request.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate" title={request.book.title}>{request.book.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">Warga: {request.user.name}</span>
                        <span>•</span>
                        <span>Diajukan: {new Date(request.requestedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {request.decidedAt && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Diproses: {new Date(request.decidedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <form action={async () => {
                            'use server';
                            await approveBorrowRequest(request.id);
                          }}>
                            <button
                              type="submit"
                              className="rounded-full bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-505 transition cursor-pointer"
                            >
                              Setujui
                            </button>
                          </form>
                          <form action={async () => {
                            'use server';
                            await rejectBorrowRequest(request.id);
                          }}>
                            <button
                              type="submit"
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Tolak
                            </button>
                          </form>
                        </div>
                      )}
                      {request.status === 'approved' && (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 font-semibold">
                          Disetujui
                        </span>
                      )}
                      {request.status === 'rejected' && (
                        <span className="rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 font-semibold">
                          Ditolak
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Manual Offline Loan Form */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Peminjaman Offline</h2>
              <p className="mt-1 text-xs text-slate-500">
                Catat peminjaman secara langsung/offline dengan nama warga dan rentang tanggal kustom.
              </p>
            </div>

            <form action={createOfflineLoan} className="space-y-3.5">
              {/* Borrower Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Peminjam</label>
                <input
                  type="text"
                  name="borrowerName"
                  placeholder="Masukkan nama peminjam"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Book Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buku yang Dipinjam</label>
                <select
                  name="bookId"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">-- Pilih Buku --</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      [{String(book.catalogNumber).padStart(3, '0')}] {book.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tanggal Pinjam</label>
                  <input
                    type="date"
                    name="borrowDate"
                    defaultValue={todayStr}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tenggat Kembali</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={defaultDueStr}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition cursor-pointer"
              >
                Catat Peminjaman Offline
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
