import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getBookAvailability, getCatalogBooks } from '@/lib/data';
import { requestBorrow, reserveBook } from '@/lib/actions';

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

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">Catalog</p>
          <h1 className="text-3xl font-semibold">Browse books from 000 to 999</h1>
        </div>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4" action="/catalog">
        <input name="search" defaultValue={params.search || ''} placeholder="Search title or author" className="rounded-xl border border-slate-200 px-3 py-2" />
        <input name="start" defaultValue={params.start || '0'} placeholder="Start (000)" className="rounded-xl border border-slate-200 px-3 py-2" />
        <input name="end" defaultValue={params.end || '999'} placeholder="End (999)" className="rounded-xl border border-slate-200 px-3 py-2" />
        <button className="rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white">Apply</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {booksWithAvailability.map((book) => (
          <article key={book.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-600">{String(book.catalogNumber).padStart(3, '0')}</p>
                <h2 className="text-lg font-semibold">{book.title}</h2>
                <p className="text-sm text-slate-600">{book.author}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase">{book.availability.status}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{book.description}</p>
            <p className="mt-3 text-sm text-slate-600">Location: {book.location}</p>
            <p className="mt-2 text-sm">Available: {book.availability.availableCopies}/{book.availability.totalCopies}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/books/${book.id}`} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">View details</Link>
              {user?.role === 'user' && (
                <>
                  <form action={requestBorrow}>
                    <input type="hidden" name="bookId" value={book.id} />
                    <button className="rounded-full bg-indigo-600 px-3 py-2 text-sm text-white">Borrow</button>
                  </form>
                  <form action={reserveBook}>
                    <input type="hidden" name="bookId" value={book.id} />
                    <button className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700">Reserve</button>
                  </form>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Showing {catalog.items.length} of {catalog.total} books</p>
        <div className="flex gap-2">
          <Link href={{ pathname: '/catalog', query: { ...params, page: String(Math.max(Number(params.page ?? 1) - 1, 1)) } }} className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700">Previous</Link>
          <Link href={{ pathname: '/catalog', query: { ...params, page: String(Number(params.page ?? 1) + 1) } }} className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700">Next</Link>
        </div>
      </div>
    </section>
  );
}
