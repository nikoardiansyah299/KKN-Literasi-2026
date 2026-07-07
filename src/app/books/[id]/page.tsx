import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getBookAvailability } from '@/lib/data';
import { getSessionUser } from '@/lib/auth';
import { requestBorrow, reserveBook } from '@/lib/actions';

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const book = await prisma.book.findUnique({ where: { id: Number(id) } });
  if (!book) notFound();

  const availability = await getBookAvailability(book.id);

  return (
    <section className="space-y-6">
      <Link href="/catalog" className="text-sm font-medium text-indigo-600">← Back to catalog</Link>
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">{String(book.catalogNumber).padStart(3, '0')}</p>
            <h1 className="text-3xl font-semibold">{book.title}</h1>
            <p className="mt-2 text-lg text-slate-600">by {book.author}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium uppercase">{availability.status}</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold">Description</p>
            <p className="mt-2 text-sm text-slate-600">{book.description}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold">Availability</p>
            <p className="mt-2 text-sm text-slate-600">Available copies: {availability.availableCopies}/{availability.totalCopies}</p>
            <p className="mt-1 text-sm text-slate-600">Active loans: {availability.activeLoans}</p>
            <p className="mt-1 text-sm text-slate-600">Active reservations: {availability.activeReservations}</p>
            <p className="mt-1 text-sm text-slate-600">Location: {book.location}</p>
          </div>
        </div>
        {user?.role === 'user' && (
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={requestBorrow}>
              <input type="hidden" name="bookId" value={book.id} />
              <button className="rounded-full bg-indigo-600 px-4 py-2 text-white">Request borrow</button>
            </form>
            <form action={reserveBook}>
              <input type="hidden" name="bookId" value={book.id} />
              <button className="rounded-full border border-slate-300 px-4 py-2">Reserve</button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
