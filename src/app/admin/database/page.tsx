import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DatabaseClient from './database-client';

export const dynamic = 'force-dynamic';

export default async function AdminDatabasePage() {
  const user = await getSessionUser();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const books = await prisma.book.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      author: true,
      catalogNumber: true,
      totalCopies: true,
      description: true,
      location: true,
      tanggalTerima: true,
      nomorInventaris: true,
      penerbit: true,
      tahunTerbit: true,
      subjek: true,
      sumber: true,
      noReg: true,
      keterangan: true,
      createdAt: true,
    },
  });

  // Serialize dates for client component
  const serialized = books.map((b) => ({
    ...b,
    tanggalTerima: b.tanggalTerima ? b.tanggalTerima.toISOString() : null,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: 'url(/img/background.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: '700px',
          opacity: 0.08,
        }}
      />

      <section className="relative mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <DatabaseClient initialBooks={serialized} />
      </section>
    </div>
  );
}
