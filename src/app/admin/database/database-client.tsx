'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

// ─── Types ─────────────────────────────────────────────────────────────────

type Book = {
  id: number;
  title: string;
  author: string;
  catalogNumber: number;
  totalCopies: number;
  description: string;
  location: string;
  tanggalTerima: string | null;
  nomorInventaris: string | null;
  penerbit: string | null;
  tahunTerbit: number | null;
  subjek: string | null;
  sumber: string | null;
  noReg: string | null;
  keterangan: string | null;
  createdAt: string;
};

type ModalMode = 'add' | 'edit' | 'delete' | 'import' | null;

const EMPTY_FORM: Omit<Book, 'id' | 'createdAt'> = {
  title: '',
  author: '',
  catalogNumber: 0,
  totalCopies: 1,
  description: '',
  location: 'Main Collection',
  tanggalTerima: null,
  nomorInventaris: null,
  penerbit: null,
  tahunTerbit: null,
  subjek: null,
  sumber: null,
  noReg: null,
  keterangan: null,
};

// Excel column header → Book field mapping
const EXCEL_COLUMN_MAP: Record<string, keyof typeof EMPTY_FORM> = {
  'Tanggal Terima': 'tanggalTerima',
  'tanggalTerima': 'tanggalTerima',
  'Nomor Inventaris': 'nomorInventaris',
  'nomorInventaris': 'nomorInventaris',
  'No. Inventaris': 'nomorInventaris',
  'Judul Buku': 'title',
  'Judul': 'title',
  'title': 'title',
  'Pengarang': 'author',
  'Penulis': 'author',
  'author': 'author',
  'Penerbit': 'penerbit',
  'penerbit': 'penerbit',
  'Tahun Terbit': 'tahunTerbit',
  'tahunTerbit': 'tahunTerbit',
  'Tahun': 'tahunTerbit',
  'Jumlah Eksemplar': 'totalCopies',
  'Jumlah': 'totalCopies',
  'totalCopies': 'totalCopies',
  'Subjek': 'subjek',
  'subjek': 'subjek',
  'Sumber': 'sumber',
  'sumber': 'sumber',
  'No.Reg': 'noReg',
  'No. Reg': 'noReg',
  'noReg': 'noReg',
  'Keterangan': 'keterangan',
  'keterangan': 'keterangan',
  'Nomor Katalog': 'catalogNumber',
  'Kode': 'catalogNumber',
  'catalogNumber': 'catalogNumber',
  'Lokasi': 'location',
  'location': 'location',
  'Deskripsi': 'description',
  'description': 'description',
};

// ─── Field config for form ─────────────────────────────────────────────────

const FIELDS: Array<{
  key: keyof typeof EMPTY_FORM;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  required?: boolean;
}> = [
  { key: 'tanggalTerima', label: 'Tanggal Terima', type: 'date' },
  { key: 'nomorInventaris', label: 'Nomor Inventaris', type: 'text' },
  { key: 'title', label: 'Judul Buku', type: 'text', required: true },
  { key: 'author', label: 'Pengarang', type: 'text', required: true },
  { key: 'penerbit', label: 'Penerbit', type: 'text' },
  { key: 'tahunTerbit', label: 'Tahun Terbit', type: 'number' },
  { key: 'totalCopies', label: 'Jumlah Eksemplar', type: 'number', required: true },
  { key: 'subjek', label: 'Subjek', type: 'text' },
  { key: 'sumber', label: 'Sumber', type: 'text' },
  { key: 'noReg', label: 'No.Reg', type: 'text' },
  { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
];

// ─── Helper ────────────────────────────────────────────────────────────────

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toInputDate(val: string | null | undefined): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function excelSerialToDate(serial: number): string {
  // Excel date serial → JS Date
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const d = new Date(utc_value * 1000);
  return d.toISOString().split('T')[0];
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function DatabaseClient({ initialBooks }: { initialBooks: Book[] }) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [form, setForm] = useState<Omit<Book, 'id' | 'createdAt'>>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Import
  const [importPreview, setImportPreview] = useState<Array<Omit<Book, 'id' | 'createdAt'>>>([]);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Filtered & paginated data ─────────────────────────────────────────────
  const filtered = books.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.nomorInventaris ?? '').toLowerCase().includes(q) ||
      (b.penerbit ?? '').toLowerCase().includes(q) ||
      (b.subjek ?? '').toLowerCase().includes(q) ||
      (b.noReg ?? '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Open modals ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSelectedBook(null);
    setModal('add');
  };

  const openEdit = (book: Book) => {
    setSelectedBook(book);
    setForm({
      title: book.title,
      author: book.author,
      catalogNumber: book.catalogNumber,
      totalCopies: book.totalCopies,
      description: book.description,
      location: book.location,
      tanggalTerima: book.tanggalTerima,
      nomorInventaris: book.nomorInventaris,
      penerbit: book.penerbit,
      tahunTerbit: book.tahunTerbit,
      subjek: book.subjek,
      sumber: book.sumber,
      noReg: book.noReg,
      keterangan: book.keterangan,
    });
    setModal('edit');
  };

  const openDelete = (book: Book) => {
    setSelectedBook(book);
    setModal('delete');
  };

  const closeModal = () => {
    setModal(null);
    setSelectedBook(null);
    setImportPreview([]);
    setImportFileName('');
  };

  // ── Form field change ─────────────────────────────────────────────────────
  const handleField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value === '' ? null : value }));
  };

  // ── CRUD API calls ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

      // Refresh list
      const listRes = await fetch('/api/admin/books?list=1');
      if (listRes.ok) setBooks(await listRes.json());
      showToast('Buku berhasil ditambahkan ✓');
      closeModal();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBook) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedBook.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengupdate');

      setBooks((prev) =>
        prev.map((b) =>
          b.id === selectedBook.id
            ? { ...b, ...form, id: b.id, createdAt: b.createdAt }
            : b
        )
      );
      showToast('Buku berhasil diperbarui ✓');
      closeModal();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBook) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedBook.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus');

      setBooks((prev) => prev.filter((b) => b.id !== selectedBook.id));
      showToast('Buku berhasil dihapus ✓');
      closeModal();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Excel import ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        const mapped = raw.map((row) => {
          const book: Omit<Book, 'id' | 'createdAt'> = { ...EMPTY_FORM };

          for (const [colName, val] of Object.entries(row)) {
            const fieldKey = EXCEL_COLUMN_MAP[colName.trim()];
            if (!fieldKey) continue;

            if (val === '' || val === null || val === undefined) continue;

            if (fieldKey === 'tanggalTerima') {
              // Could be Excel serial date or string
              if (typeof val === 'number') {
                (book as Record<string, unknown>)[fieldKey] = excelSerialToDate(val);
              } else {
                const d = new Date(String(val));
                (book as Record<string, unknown>)[fieldKey] = isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
              }
            } else if (fieldKey === 'tahunTerbit' || fieldKey === 'totalCopies' || fieldKey === 'catalogNumber') {
              (book as Record<string, unknown>)[fieldKey] = Number(val) || 0;
            } else {
              (book as Record<string, unknown>)[fieldKey] = String(val).trim();
            }
          }

          return book;
        });

        setImportPreview(mapped.filter((b) => b.title));
        setModal('import');
      } catch {
        showToast('Gagal membaca file Excel', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: importPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import gagal');

      // Reload books list
      const listRes = await fetch('/api/admin/books?list=1');
      if (listRes.ok) setBooks(await listRes.json());

      showToast(`Import selesai: ${data.imported} ditambahkan, ${data.skipped} dilewati ✓`);
      closeModal();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20';

  const renderField = (f: (typeof FIELDS)[number], value: Omit<Book, 'id' | 'createdAt'>) => {
    const raw = value[f.key];
    const strVal = raw === null || raw === undefined ? '' : String(raw);

    if (f.type === 'textarea') {
      return (
        <textarea
          id={`field-${f.key}`}
          rows={2}
          className={inputClass}
          value={strVal}
          placeholder={f.label}
          onChange={(e) => handleField(f.key, e.target.value)}
        />
      );
    }

    if (f.type === 'date') {
      return (
        <input
          id={`field-${f.key}`}
          type="date"
          className={inputClass}
          value={f.key === 'tanggalTerima' ? toInputDate(strVal) : strVal}
          onChange={(e) => handleField(f.key, e.target.value)}
        />
      );
    }

    return (
      <input
        id={`field-${f.key}`}
        type={f.type}
        className={inputClass}
        value={strVal}
        placeholder={f.label + (f.required ? ' *' : '')}
        required={f.required}
        onChange={(e) => handleField(f.key, e.target.value)}
      />
    );
  };

  const COLUMNS = [
    { key: 'tanggalTerima', label: 'Tanggal Terima', render: (b: Book) => fmtDate(b.tanggalTerima), w: 120 },
    { key: 'nomorInventaris', label: 'Nomor Inventaris', render: (b: Book) => b.nomorInventaris ?? '—', w: 140 },
    { key: 'title', label: 'Judul Buku', render: (b: Book) => b.title, w: 220 },
    { key: 'author', label: 'Pengarang', render: (b: Book) => b.author, w: 150 },
    { key: 'penerbit', label: 'Penerbit', render: (b: Book) => b.penerbit ?? '—', w: 130 },
    { key: 'tahunTerbit', label: 'Tahun Terbit', render: (b: Book) => b.tahunTerbit ?? '—', w: 100 },
    { key: 'totalCopies', label: 'Jumlah Eksemplar', render: (b: Book) => b.totalCopies, w: 120 },
    { key: 'subjek', label: 'Subjek', render: (b: Book) => b.subjek ?? '—', w: 120 },
    { key: 'sumber', label: 'Sumber', render: (b: Book) => b.sumber ?? '—', w: 110 },
    { key: 'noReg', label: 'No.Reg', render: (b: Book) => b.noReg ?? '—', w: 90 },
    { key: 'keterangan', label: 'Keterangan', render: (b: Book) => b.keterangan ?? '—', w: 150 },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] rounded-xl px-5 py-3 text-sm font-semibold shadow-lg border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Header bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-600">Admin Panel</p>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Database Buku</h1>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length} buku ditemukan</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor="excel-upload"
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            title="Import dari Excel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Import Excel
            <input
              id="excel-upload"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
            />
          </label>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Tambah Buku
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Cari judul, pengarang, nomor inventaris, subjek..."
          className="w-full max-w-lg rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* ── Data table ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap w-10">#</th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    style={{ minWidth: col.w }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-semibold text-slate-500 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="py-12 text-center text-sm text-slate-400">
                    {search ? 'Tidak ada hasil yang cocok.' : 'Belum ada data buku.'}
                  </td>
                </tr>
              )}
              {pageData.map((book, idx) => (
                <tr
                  key={book.id}
                  className="hover:bg-indigo-50/40 transition-colors"
                >
                  <td className="px-3 py-2.5 text-slate-400 font-mono">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-2.5 text-slate-700 whitespace-nowrap"
                      style={{ maxWidth: col.w, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={String(col.render(book))}
                    >
                      {col.key === 'title' ? (
                        <span className="font-medium text-slate-900">{col.render(book)}</span>
                      ) : col.render(book)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(book)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1.125 1.125-4.5L16.862 3.487z" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => openDelete(book)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                        title="Hapus"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Halaman {page} dari {totalPages} · {filtered.length} buku total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Backdrop */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-10 pb-6 px-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          {/* ── Add / Edit modal ── */}
          {(modal === 'add' || modal === 'edit') && (
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  {modal === 'add' ? '➕ Tambah Buku Baru' : '✏️ Edit Buku'}
                </h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                {FIELDS.map((f) => (
                  <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor={`field-${f.key}`}>
                      {f.label}{f.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                    {renderField(f, form)}
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={modal === 'add' ? handleCreate : handleUpdate}
                  disabled={loading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {loading ? 'Menyimpan...' : modal === 'add' ? 'Tambah Buku' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          )}

          {/* ── Delete modal ── */}
          {modal === 'delete' && selectedBook && (
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 mx-auto mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7 text-rose-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Hapus Buku</h2>
                <p className="text-sm text-slate-600 mb-1">
                  Anda yakin ingin menghapus:
                </p>
                <p className="font-semibold text-slate-900 mb-1">{selectedBook.title}</p>
                <p className="text-xs text-slate-500 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                  >
                    {loading ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Import preview modal ── */}
          {modal === 'import' && (
            <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">📥 Preview Import Excel</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {importFileName} · <span className="font-semibold text-indigo-600">{importPreview.length} baris</span> siap diimpor
                  </p>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {importPreview.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">
                  Tidak ada data valid yang ditemukan. Pastikan file memiliki kolom yang sesuai.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[55vh]">
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                      <tr>
                        {['Tgl Terima', 'No. Inventaris', 'Judul', 'Pengarang', 'Penerbit', 'Thn', 'Eks.', 'Subjek', 'Sumber', 'No.Reg', 'Keterangan'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-indigo-50/30">
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{fmtDate(row.tanggalTerima)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.nomorInventaris ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900 max-w-[180px] truncate">{row.title}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 max-w-[120px] truncate">{row.author}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.penerbit ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.tahunTerbit ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.totalCopies}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.subjek ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.sumber ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600">{row.noReg ?? '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-600 max-w-[120px] truncate">{row.keterangan ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Buku dengan Nomor Inventaris yang sudah ada akan dilewati.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    disabled={loading || importPreview.length === 0}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {loading ? 'Mengimpor...' : `Konfirmasi Import (${importPreview.length})`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
