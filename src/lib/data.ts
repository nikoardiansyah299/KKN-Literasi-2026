import { prisma } from './prisma';
import { getSessionUser } from './auth';

export type BookAvailability = {
  totalCopies: number;
  activeLoans: number;
  activeReservations: number;
  availableCopies: number;
  status: 'available' | 'borrowed' | 'reserved';
};

type CatalogBook = {
  id: number;
  title: string;
  author: string;
  catalogNumber: number;
  totalCopies: number;
  description: string;
  location: string;
  nomorInventaris: string | null;
};

const fallbackCatalogBooks: CatalogBook[] = [
  {
    id: 1,
    title: 'The Knowledge Atlas',
    author: 'Mira Aditya',
    catalogNumber: 12,
    nomorInventaris: '12',
    totalCopies: 3,
    description: 'A general reference guide for community learning.',
    location: 'Main Collection',
  },
  {
    id: 2,
    title: 'Digital Literacy Basics',
    author: 'Raka Firmansyah',
    catalogNumber: 35,
    nomorInventaris: '35',
    totalCopies: 2,
    description: 'Practical lessons for digital citizenship and everyday technology.',
    location: 'Main Collection',
  },
  {
    id: 3,
    title: 'History of Nusantara',
    author: 'Sinta Wibowo',
    catalogNumber: 109,
    nomorInventaris: '109',
    totalCopies: 4,
    description: 'A concise regional history overview for learners.',
    location: 'Main Collection',
  },
];

function getFallbackAvailability(bookId: number): BookAvailability {
  const fallbackBook = fallbackCatalogBooks.find((book) => book.id === bookId);
  if (!fallbackBook) {
    return { totalCopies: 0, activeLoans: 0, activeReservations: 0, availableCopies: 0, status: 'borrowed' };
  }

  return {
    totalCopies: fallbackBook.totalCopies,
    activeLoans: 0,
    activeReservations: 0,
    availableCopies: fallbackBook.totalCopies,
    status: 'available',
  };
}

function getFallbackCatalog(params: { search?: string; start?: number; end?: number; page?: number; pageSize?: number }) {
  const search = params.search?.trim().toLowerCase() || '';
  const start = Number(params.start ?? 1);
  const end = Number(params.end ?? 1000);
  const page = Math.max(Number(params.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(params.pageSize ?? 12), 1), 50);

  const filtered = fallbackCatalogBooks.filter((book) => {
    const num = book.nomorInventaris ? parseInt(book.nomorInventaris, 10) : NaN;
    const matchesRange = !isNaN(num) && num >= start && num <= end;
    const matchesSearch = !search || `${book.title} ${book.author} ${book.description}`.toLowerCase().includes(search);
    return matchesRange && matchesSearch;
  });

  const items = filtered.slice((page - 1) * pageSize, page * pageSize);
  return { items, total: filtered.length, page, pageSize };
}

export async function getBookAvailability(bookId: number): Promise<BookAvailability> {
  try {
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
  } catch (error) {
    console.error('Falling back to sample availability data:', error);
    return getFallbackAvailability(bookId);
  }
}

export async function getBookById(bookId: number) {
  try {
    return await prisma.book.findUnique({ where: { id: bookId } });
  } catch (error) {
    console.error('Falling back to sample book data:', error);
    return fallbackCatalogBooks.find((book) => book.id === bookId) ?? null;
  }
}

export async function getCatalogBooks(
  params: { search?: string; start?: number; end?: number; page?: number; pageSize?: number },
  prismaClient = prisma
) {
  try {
    const search = params.search?.trim() || '';
    const start = Number(params.start ?? 1);
    const end = Number(params.end ?? 1000);
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
      prismaClient.book.findMany({
        where,
        orderBy: [{ catalogNumber: 'asc' }, { title: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prismaClient.book.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error('Falling back to sample catalog data:', error);
    return getFallbackCatalog(params);
  }
}

export async function getDashboardData() {
  const user = await getSessionUser();
  if (!user) return null;

  try {
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
  } catch (error) {
    console.error('getDashboardData: database error, returning empty data:', error);
    return { user, loans: [], notifications: [], reservations: [], requests: [] };
  }
}

export async function getAdminDashboardData() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') return null;

  try {
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
  } catch (error) {
    console.error('getAdminDashboardData: database error, returning empty data:', error);
    return {
      user,
      books: [],
      requests: [],
      loans: [],
      notifications: [],
      analytics: { users: 0, booksCount: 0, activeLoans: 0, overdueLoans: 0, pendingRequests: 0, mostBorrowed: [] },
    };
  }
}

export async function getPersetujuanData() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') return null;

  try {
    const [requests, books, users] = await Promise.all([
      prisma.borrowRequest.findMany({
        orderBy: { requestedAt: 'desc' },
        include: { user: true, book: true },
      }),
      prisma.book.findMany({
        orderBy: [{ title: 'asc' }],
      }),
      prisma.user.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);
    return { requests, books, users };
  } catch (error) {
    console.error('getPersetujuanData: database error, returning empty data:', error);
    return { requests: [], books: [], users: [] };
  }
}
