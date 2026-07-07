import { prisma } from './prisma';
import { getSessionUser } from './auth';

export type BookAvailability = {
  totalCopies: number;
  activeLoans: number;
  activeReservations: number;
  availableCopies: number;
  status: 'available' | 'borrowed' | 'reserved';
};

export async function getBookAvailability(bookId: number): Promise<BookAvailability> {
  const [book, activeLoans, activeReservations] = await Promise.all([
    prisma.book.findUnique({ where: { id: bookId } }),
    prisma.loan.count({ where: { bookId, returnedAt: null } }),
    prisma.reservation.count({ where: { bookId, status: 'active' } }),
  ]);

  if (!book) {
    return { totalCopies: 0, activeLoans: 0, activeReservations: 0, availableCopies: 0, status: 'borrowed' };
  }

  const availableCopies = Math.max(book.totalCopies - activeLoans, 0);
  const status = availableCopies > 0 ? 'available' : activeReservations > 0 ? 'reserved' : 'borrowed';
  return { totalCopies: book.totalCopies, activeLoans, activeReservations, availableCopies, status };
}

export async function getCatalogBooks(params: { search?: string; start?: number; end?: number; page?: number; pageSize?: number }) {
  const search = params.search?.trim() || '';
  const start = Number(params.start ?? 0);
  const end = Number(params.end ?? 999);
  const page = Math.max(Number(params.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(params.pageSize ?? 12), 1), 50);

  const where = {
    catalogNumber: { gte: start, lte: end },
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { author: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [{ catalogNumber: 'asc' }, { title: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.book.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
  };
}

export async function getDashboardData() {
  const user = await getSessionUser();
  if (!user) return null;

  const [loans, notifications, reservations, requests] = await Promise.all([
    prisma.loan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { book: true },
    }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.reservation.findMany({ where: { userId: user.id, status: 'active' }, orderBy: { createdAt: 'desc' }, include: { book: true } }),
    prisma.borrowRequest.findMany({ where: { userId: user.id }, orderBy: { requestedAt: 'desc' }, include: { book: true } }),
  ]);

  return { user, loans, notifications, reservations, requests };
}

export async function getAdminDashboardData() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') return null;

  const [books, requests, loans, notifications, analytics] = await Promise.all([
    prisma.book.findMany({ orderBy: [{ catalogNumber: 'asc' }, { title: 'asc' }] }),
    prisma.borrowRequest.findMany({ orderBy: { requestedAt: 'desc' }, include: { user: true, book: true } }),
    prisma.loan.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true, book: true } }),
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.$transaction(async (tx) => {
      const [users, booksCount, activeLoans, overdueLoans, pendingRequests, mostBorrowed] = await Promise.all([
        tx.user.count({ where: { role: 'user' } }),
        tx.book.count(),
        tx.loan.count({ where: { returnedAt: null } }),
        tx.loan.count({ where: { returnedAt: null, dueDate: { lt: new Date() } } }),
        tx.borrowRequest.count({ where: { status: 'pending' } }),
        tx.$queryRaw<{ id: number; title: string; borrow_count: bigint }[]>`SELECT b.id, b.title, COUNT(*)::int as borrow_count FROM loans l JOIN books b ON b.id = l.book_id GROUP BY b.id, b.title ORDER BY borrow_count DESC LIMIT 5`,
      ]);
      return { users, booksCount, activeLoans, overdueLoans, pendingRequests, mostBorrowed };
    }),
  ]);

  return { user, books, requests, loans, notifications, analytics };
}
