import Link from 'next/link';
import { getAdminDashboardData } from '@/lib/data';
import { approveBorrowRequest, rejectBorrowRequest, returnLoan, deleteBook } from '@/lib/actions';
import OfflineLoanForm from '@/components/offline-loan-form';

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          Hanya administrator yang dapat mengakses area ini.
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 mb-1">Admin Panel</p>
        <h1 className="text-2xl font-bold text-slate-900">Workspace Admin</h1>
        <p className="mt-1 text-xs text-slate-500">Kelola katalog buku, setujui peminjaman, dan tinjau aktivitas inventaris.</p>
      </div>

      {/* Analytics stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pengguna</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.analytics.users}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Buku</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.analytics.booksCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pinjaman Aktif</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.analytics.activeLoans}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Menunggu Persetujuan</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{data.analytics.pendingRequests}</p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Form & Inventory */}
        <div className="space-y-6">
          {/* Pinjam Buku Manual */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs">📋</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Pinjam Buku Manual</h2>
            </div>
            <p className="text-xs text-slate-500">Catat peminjaman buku secara offline / langsung di perpustakaan.</p>
            <OfflineLoanForm
              books={data.books.map((b) => ({
                id: b.id,
                title: b.title,
                author: b.author,
                nomorInventaris: b.nomorInventaris ?? null,
              }))}
            />
          </div>

          {/* Inventory */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Inventaris Buku ({data.books.length})</h2>
            <div className="mt-4 divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {data.books.map((book) => (
                <div key={book.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono font-semibold text-indigo-700 shrink-0">
                      {book.nomorInventaris ?? '—'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate" title={book.title}>{book.title}</p>
                      <p className="text-slate-500 truncate">Oleh {book.author}</p>
                    </div>
                  </div>
                  <form action={async () => { 'use server'; await deleteBook(book.id); }} className="shrink-0">
                    <button className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer">
                      Hapus
                    </button>
                  </form>
                </div>
              ))}
              {data.books.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-500">Tidak ada buku di inventaris.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Approvals & Returns */}
        <div className="space-y-6">
          {/* Borrow approvals */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Persetujuan Peminjaman</h2>
              <Link href="/admin/persetujuan" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Selengkapnya →
              </Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {data.requests.map((request) => (
                <div key={request.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate" title={request.book.title}>{request.book.title}</p>
                    <p className="text-slate-500 truncate">Diajukan oleh {request.user.name} • {request.status}</p>
                  </div>
                  <div className="shrink-0">
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <form action={async () => { 'use server'; await approveBorrowRequest(request.id); }}>
                          <button className="rounded-full bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-500 transition cursor-pointer">
                            Setujui
                          </button>
                        </form>
                        <form action={async () => { 'use server'; await rejectBorrowRequest(request.id); }}>
                          <button className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            Tolak
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${
                        request.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {request.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {data.requests.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-500">Tidak ada pengajuan peminjaman.</p>
              )}
            </div>
          </div>

          {/* Loan returns */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Pengembalian Buku</h2>
            <div className="mt-4 divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {data.loans.map((loan) => (
                <div key={loan.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate" title={loan.book.title}>{loan.book.title}</p>
                    <p className="text-slate-500 truncate">
                      Dipinjam oleh {loan.user.name} • Tenggat {new Date(loan.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {loan.returnedAt ? (
                      <span className="rounded bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        Dikembalikan
                      </span>
                    ) : (
                      <form action={async () => { 'use server'; await returnLoan(loan.id); }}>
                        <button className="rounded-full bg-indigo-600 px-2.5 py-1 font-semibold text-white hover:bg-indigo-500 transition cursor-pointer">
                          Selesai
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              {data.loans.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-500">Tidak ada data peminjaman.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
