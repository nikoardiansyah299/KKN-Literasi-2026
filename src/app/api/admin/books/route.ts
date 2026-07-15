import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const list = request.nextUrl.searchParams.get('list');
  if (list) {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, author: true, catalogNumber: true, totalCopies: true,
        description: true, location: true, tanggalTerima: true, nomorInventaris: true,
        penerbit: true, tahunTerbit: true, subjek: true, sumber: true, noReg: true,
        keterangan: true, createdAt: true,
      },
    });
    return NextResponse.json(
      books.map((b) => ({
        ...b,
        tanggalTerima: b.tanggalTerima ? b.tanggalTerima.toISOString() : null,
        createdAt: b.createdAt.toISOString(),
      }))
    );
  }
  return NextResponse.json({ ok: true });
}

async function getAdminUser() {
  const token = (await cookies()).get('library_token')?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.role !== 'admin') return null;
    return user;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { books: Array<Record<string, string>> };
    const books = body.books;

    if (!Array.isArray(books) || books.length === 0) {
      return NextResponse.json({ error: 'No books provided' }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (const item of books) {
      try {
        const tanggalTerima = item.tanggalTerima ? new Date(item.tanggalTerima) : null;
        const tahunTerbit = item.tahunTerbit ? Number(item.tahunTerbit) : null;
        const nomorInventaris = item.nomorInventaris?.trim() || null;

        // Skip if nomorInventaris already exists
        if (nomorInventaris) {
          const existing = await prisma.book.findUnique({ where: { nomorInventaris } });
          if (existing) { skipped++; continue; }
        }

        await prisma.book.create({
          data: {
            title: item.title?.trim() || 'Untitled',
            author: item.author?.trim() || '',
            catalogNumber: Number(item.catalogNumber) || 0,
            totalCopies: Number(item.totalCopies) || 1,
            description: item.description?.trim() || '',
            location: item.location?.trim() || 'Main Collection',
            tanggalTerima,
            nomorInventaris,
            penerbit: item.penerbit?.trim() || null,
            tahunTerbit,
            subjek: item.subjek?.trim() || null,
            sumber: item.sumber?.trim() || null,
            noReg: item.noReg?.trim() || null,
            keterangan: item.keterangan?.trim() || null,
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'book_import',
        details: `Imported ${imported} books, skipped ${skipped}`,
      },
    });

    revalidatePath('/admin/database');
    revalidatePath('/catalog');

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json() as { id: number };
    await prisma.book.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { userId: admin.id, action: 'book_delete', details: `Deleted book ${id}` },
    });
    revalidatePath('/admin/database');
    revalidatePath('/catalog');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, string>;
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const tanggalTerima = body.tanggalTerima ? new Date(body.tanggalTerima) : null;
    const tahunTerbit = body.tahunTerbit ? Number(body.tahunTerbit) : null;
    const nomorInventaris = body.nomorInventaris?.trim() || null;

    await prisma.book.update({
      where: { id },
      data: {
        title: body.title?.trim() || '',
        author: body.author?.trim() || '',
        catalogNumber: Number(body.catalogNumber) || 0,
        totalCopies: Number(body.totalCopies) || 1,
        description: body.description?.trim() || '',
        location: body.location?.trim() || 'Main Collection',
        tanggalTerima,
        nomorInventaris,
        penerbit: body.penerbit?.trim() || null,
        tahunTerbit,
        subjek: body.subjek?.trim() || null,
        sumber: body.sumber?.trim() || null,
        noReg: body.noReg?.trim() || null,
        keterangan: body.keterangan?.trim() || null,
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { userId: admin.id, action: 'book_update', details: `Updated book ${id}` },
    });

    revalidatePath('/admin/database');
    revalidatePath('/catalog');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, string>;

    const tanggalTerima = body.tanggalTerima ? new Date(body.tanggalTerima) : null;
    const tahunTerbit = body.tahunTerbit ? Number(body.tahunTerbit) : null;
    const nomorInventaris = body.nomorInventaris?.trim() || null;

    const book = await prisma.book.create({
      data: {
        title: body.title?.trim() || 'Untitled',
        author: body.author?.trim() || '',
        catalogNumber: Number(body.catalogNumber) || 0,
        totalCopies: Number(body.totalCopies) || 1,
        description: body.description?.trim() || '',
        location: body.location?.trim() || 'Main Collection',
        tanggalTerima,
        nomorInventaris,
        penerbit: body.penerbit?.trim() || null,
        tahunTerbit,
        subjek: body.subjek?.trim() || null,
        sumber: body.sumber?.trim() || null,
        noReg: body.noReg?.trim() || null,
        keterangan: body.keterangan?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: { userId: admin.id, action: 'book_create', details: `Created book ${book.id}` },
    });

    revalidatePath('/admin/database');
    revalidatePath('/catalog');

    return NextResponse.json({ success: true, id: book.id });
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: 'Create failed' }, { status: 500 });
  }
}
