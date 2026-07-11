import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getBookAvailability, getCatalogBooks } from '@/lib/data';
import { requestBorrow } from '@/lib/actions';
import { prisma } from '@/lib/prisma';

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ search?: string; start?: string; end?: string; page?: string }> }) {
  const params = await searchParams;
  const user = await getSessionUser();
  const catalog = await getCatalogBooks({
    search: params.search,
    start: Number(params.start ?? 0),
    end: Number(params.end ?? 999),
    page: Number(params.page ?? 1),
    pageSize: 12,
  });

  const booksWithAvailability = await Promise.all(
    catalog.items.map(async (book) => ({ ...book, availability: await getBookAvailability(book.id) }))
  );

  // Fetch the user's pending requests and active loans for all books on this page in one query
  const bookIds = catalog.items.map((b) => b.id);
  let pendingBookIds = new Set<number>();
  let activelyBorrowedBookIds = new Set<number>();

  if (user?.role === 'user' && bookIds.length > 0) {
    const [pendingRequests, activeLoans] = await Promise.all([
      prisma.borrowRequest.findMany({
        where: { userId: user.id, bookId: { in: bookIds }, status: 'pending' },
        select: { bookId: true },
      }),
      prisma.loan.findMany({
        where: { userId: user.id, bookId: { in: bookIds }, returnedAt: null },
        select: { bookId: true },
      }),
    ]);
    pendingBookIds = new Set(pendingRequests.map((r) => r.bookId));
    activelyBorrowedBookIds = new Set(activeLoans.map((l) => l.bookId));
  }

  const statusMap: Record<string, string> = {
    available: 'Tersedia',
    borrowed: 'Dipinjam',
    reserved: 'Dipesan',
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-600">Katalog</p>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Jelajahi Buku dari Kode 000 hingga 999</h1>
      </div>

      <div className="flex justify-center w-full">
        <form className="w-full max-w-3xl grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-12" action="/catalog">
          <div className="sm:col-span-6">
            <input 
              name="search" 
              defaultValue={params.search || ''} 
              placeholder="Cari judul atau penulis" 
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
            />
          </div>
          <div className="sm:col-span-2">
            <input 
              name="start" 
              defaultValue={params.start || '0'} 
              placeholder="Mulai (000)" 
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
            />
          </div>
          <div className="sm:col-span-2">
            <input 
              name="end" 
              defaultValue={params.end || '999'} 
              placeholder="Akhir (999)" 
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
            />
          </div>
          <div className="sm:col-span-2">
            <button className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white text-sm hover:bg-indigo-700 transition cursor-pointer">
              Terapkan
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {booksWithAvailability.map((book) => {
          const isAvailable = book.availability.availableCopies > 0;
          const statusLabel = statusMap[book.availability.status] || book.availability.status;

          const hasPendingRequest = pendingBookIds.has(book.id);
          const hasActiveLoan = activelyBorrowedBookIds.has(book.id);
          const borrowDisabled = hasPendingRequest || hasActiveLoan;
          const borrowLabel = hasActiveLoan
            ? 'Sedang Dipinjam'
            : hasPendingRequest
            ? 'Menunggu Persetujuan'
            : 'Pinjam';

          return (
            <article 
              key={book.id} 
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:shadow-md border-l-4 ${
                isAvailable 
                  ? 'border-slate-200 border-l-emerald-500 hover:border-emerald-400 bg-emerald-50/5' 
                  : 'border-slate-200 border-l-rose-500 hover:border-rose-400 bg-rose-50/5'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-indigo-600">{String(book.catalogNumber).padStart(3, '0')}</p>
                    <h2 className="text-lg font-semibold mt-1 text-slate-900 leading-snug">{book.title}</h2>
                    <p className="text-sm text-slate-500">Oleh {book.author}</p>
                  </div>
                  <span 
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase border tracking-wider shrink-0 ${
                      isAvailable 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600 line-clamp-3 leading-relaxed">{book.description}</p>
                <p className="mt-3 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Lokasi:</span> {book.location}
                </p>
                <p className={`mt-2 text-sm font-semibold ${isAvailable ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Tersedia: {book.availability.availableCopies}/{book.availability.totalCopies}
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                <Link 
                  href={`/books/${book.id}`} 
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  Lihat detail
                </Link>
                {user?.role === 'user' && (
                  <form action={requestBorrow}>
                    <input type="hidden" name="bookId" value={book.id} />
                    <button
                      type="submit"
                      disabled={borrowDisabled}
                      title={borrowDisabled ? borrowLabel : 'Ajukan peminjaman'}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        borrowDisabled
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                      }`}
                    >
                      {borrowLabel}
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Menampilkan {catalog.items.length} dari {catalog.total} buku</p>
        <div className="flex gap-2">
          <Link 
            href={{ pathname: '/catalog', query: { ...params, page: String(Math.max(Number(params.page ?? 1) - 1, 1)) } }} 
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Sebelumnya
          </Link>
          <Link 
            href={{ pathname: '/catalog', query: { ...params, page: String(Number(params.page ?? 1) + 1) } }} 
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Berikutnya
          </Link>
        </div>
      </div>
    </section>
  );
}
