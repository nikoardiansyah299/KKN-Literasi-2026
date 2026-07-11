"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { comparePassword, hashPassword, signToken } from './auth';
import { prisma } from './prisma';

const DAILY_LATE_FEE = Number(process.env.DAILY_LATE_FEE || 2000);
const BORROW_DAYS_DEFAULT = Number(process.env.BORROW_DAYS_DEFAULT || 14);

async function createAuditLog(userId: number | null, action: string, details: string) {
  await prisma.auditLog.create({ data: { userId, action, details } });
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  const user = await prisma.user.findUnique({ where: { email } });

  // Google-only account — no password set
  if (user && !user.passwordHash) {
    redirect('/login?error=no_password');
  }

  if (!user || !comparePassword(password, user.passwordHash!)) {
    redirect('/login?error=invalid');
  }

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  (await cookies()).set('library_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
  await createAuditLog(user.id, 'login', 'User signed in');
  revalidatePath('/');
  redirect('/catalog');
}

export async function register(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!name || !email || password.length < 6) {
    redirect('/register?error=invalid');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect('/register?error=exists');
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: 'user',
    },
  });

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  (await cookies()).set('library_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
  await createAuditLog(user.id, 'register', 'User registered');
  revalidatePath('/');
  redirect('/catalog');
}

export async function logout() {
  const token = (await cookies()).get('library_token')?.value;
  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      await createAuditLog(payload.id, 'logout', 'User signed out');
    } catch {
      // ignore malformed tokens
    }
  }

  (await cookies()).delete('library_token');
  redirect('/');
}

export async function requestBorrow(formData: FormData) {
  const user = await getSessionUserOrRedirect();
  const bookId = Number(formData.get('bookId'));
  const existing = await prisma.borrowRequest.findFirst({ where: { userId: user.id, bookId, status: 'pending' } });
  if (existing) {
    throw new Error('Request already pending');
  }

  await prisma.borrowRequest.create({ data: { userId: user.id, bookId } });
  await createAuditLog(user.id, 'borrow_request', `Requested book ${bookId}`);
  revalidatePath('/catalog');
  revalidatePath(`/books/${bookId}`);
}

export async function reserveBook(formData: FormData) {
  const user = await getSessionUserOrRedirect();
  const bookId = Number(formData.get('bookId'));
  const existing = await prisma.reservation.findFirst({ where: { userId: user.id, bookId, status: 'active' } });
  if (existing) {
    throw new Error('Reservation already active');
  }
  await prisma.reservation.create({ data: { userId: user.id, bookId } });
  await createAuditLog(user.id, 'reservation', `Reserved book ${bookId}`);
  revalidatePath('/catalog');
  revalidatePath(`/books/${bookId}`);
}

export async function changePassword(formData: FormData) {
  const user = await getSessionUserOrRedirect();
  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !comparePassword(currentPassword, record.passwordHash) || newPassword.length < 6) {
    throw new Error('Invalid password change request');
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });
  await createAuditLog(user.id, 'password_change', 'Password updated');
  revalidatePath('/profile');
}

export async function createBook(formData: FormData) {
  const user = await getSessionUserOrRedirect('admin');
  const title = String(formData.get('title') || '').trim();
  const author = String(formData.get('author') || '').trim();
  const catalogNumber = Number(formData.get('catalogNumber') || 0);
  const totalCopies = Number(formData.get('totalCopies') || 1);
  const description = String(formData.get('description') || '').trim();
  const location = String(formData.get('location') || 'Main Collection').trim();

  if (!title || !author) {
    throw new Error('Title and author are required');
  }

  await prisma.book.create({ data: { title, author, catalogNumber, totalCopies, description, location } });
  await createAuditLog(user.id, 'book_create', `Created book ${title}`);
  revalidatePath('/admin');
  revalidatePath('/catalog');
}

export async function updateBook(id: number, formData: FormData) {
  const user = await getSessionUserOrRedirect('admin');
  const title = String(formData.get('title') || '').trim();
  const author = String(formData.get('author') || '').trim();
  const catalogNumber = Number(formData.get('catalogNumber') || 0);
  const totalCopies = Number(formData.get('totalCopies') || 1);
  const description = String(formData.get('description') || '').trim();
  const location = String(formData.get('location') || 'Main Collection').trim();

  await prisma.book.update({ where: { id }, data: { title, author, catalogNumber, totalCopies, description, location } });
  await createAuditLog(user.id, 'book_update', `Updated book ${id}`);
  revalidatePath('/admin');
  revalidatePath('/catalog');
  revalidatePath(`/books/${id}`);
}

export async function deleteBook(id: number) {
  const user = await getSessionUserOrRedirect('admin');
  await prisma.book.delete({ where: { id } });
  await createAuditLog(user.id, 'book_delete', `Deleted book ${id}`);
  revalidatePath('/admin');
  revalidatePath('/catalog');
}

export async function importBooks(formData: FormData) {
  const user = await getSessionUserOrRedirect('admin');
  const payload = String(formData.get('payload') || '').trim();
  const items = JSON.parse(payload);
  for (const item of items) {
    await prisma.book.create({ data: { title: item.title, author: item.author, catalogNumber: Number(item.catalogNumber), totalCopies: Number(item.totalCopies || 1), description: item.description || '', location: item.location || 'Main Collection' } });
  }
  await createAuditLog(user.id, 'book_import', `Imported ${items.length} books`);
  revalidatePath('/admin');
  revalidatePath('/catalog');
}

export async function approveBorrowRequest(id: number) {
  const user = await getSessionUserOrRedirect('admin');
  const request = await prisma.borrowRequest.findUnique({ where: { id }, include: { book: true } });
  if (!request || request.status !== 'pending') throw new Error('Pending request not found');

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + BORROW_DAYS_DEFAULT);

  await prisma.$transaction(async (tx) => {
    await tx.borrowRequest.update({ where: { id }, data: { status: 'approved', adminId: user.id, decidedAt: new Date() } });
    await tx.loan.create({ data: { userId: request.userId, bookId: request.bookId, borrowRequestId: request.id, dueDate } });
    await tx.notification.create({ data: { userId: request.userId, message: `Your borrow request was approved. Due date: ${dueDate.toDateString()}.` } });
  });

  await createAuditLog(user.id, 'borrow_approve', `Approved request ${id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/persetujuan');
}

export async function rejectBorrowRequest(id: number) {
  const user = await getSessionUserOrRedirect('admin');
  const request = await prisma.borrowRequest.findUnique({ where: { id } });
  if (!request || request.status !== 'pending') throw new Error('Pending request not found');

  await prisma.borrowRequest.update({ where: { id }, data: { status: 'rejected', adminId: user.id, decidedAt: new Date() } });
  await prisma.notification.create({ data: { userId: request.userId, message: 'Your borrow request was rejected.' } });
  await createAuditLog(user.id, 'borrow_reject', `Rejected request ${id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/persetujuan');
}

export async function createOfflineLoan(formData: FormData) {
  const adminUser = await getSessionUserOrRedirect('admin');
  const borrowerName = String(formData.get('borrowerName') || '').trim();
  const bookId = Number(formData.get('bookId'));
  const borrowDateStr = String(formData.get('borrowDate') || '').trim();
  const dueDateStr = String(formData.get('dueDate') || '').trim();

  if (!borrowerName) throw new Error('Nama peminjam wajib diisi');
  if (!bookId) throw new Error('Buku wajib dipilih');
  if (!borrowDateStr) throw new Error('Tanggal pinjam wajib diisi');
  if (!dueDateStr) throw new Error('Tanggal kembali wajib diisi');

  const borrowDate = new Date(borrowDateStr);
  const dueDate = new Date(dueDateStr);

  if (isNaN(borrowDate.getTime())) throw new Error('Tanggal pinjam tidak valid');
  if (isNaN(dueDate.getTime())) throw new Error('Tanggal kembali tidak valid');

  // Find or create user
  let userRecord = await prisma.user.findFirst({
    where: { name: { equals: borrowerName, mode: 'insensitive' } }
  });

  if (!userRecord) {
    const sanitized = borrowerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `offline-${sanitized}-${Date.now()}@library.offline`;
    userRecord = await prisma.user.create({
      data: {
        name: borrowerName,
        email,
        role: 'user'
      }
    });
  }

  // Check if book exists
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) throw new Error('Buku tidak ditemukan');

  // Create the loan
  await prisma.loan.create({
    data: {
      userId: userRecord.id,
      bookId,
      dueDate,
      createdAt: borrowDate
    }
  });

  await createAuditLog(adminUser.id, 'offline_loan_create', `Created offline loan for ${borrowerName} - Book: ${book.title}`);
  revalidatePath('/admin');
  revalidatePath('/admin/persetujuan');
}

export async function returnLoan(id: number) {
  const user = await getSessionUserOrRedirect('admin');
  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan || loan.returnedAt) throw new Error('Loan not found or already returned');

  const now = new Date();
  const overdueDays = Math.max(Math.ceil((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)), 0);
  const lateFee = overdueDays > 0 ? overdueDays * DAILY_LATE_FEE : 0;

  await prisma.loan.update({ where: { id }, data: { returnedAt: now, lateFee } });
  await createAuditLog(user.id, 'loan_return', `Returned loan ${id}`);
  revalidatePath('/admin');
  revalidatePath('/admin/persetujuan');
}

async function getSessionUserOrRedirect(role?: string) {
  const token = (await cookies()).get('library_token')?.value;
  if (!token) redirect('/login');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || (role && user.role !== role)) redirect('/login');
  return user;
}
