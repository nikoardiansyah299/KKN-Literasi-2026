'use client';

import { useRef, useState, useTransition } from 'react';
import { createOfflineLoan } from '@/lib/actions';

type BookOption = {
  id: number;
  title: string;
  author: string;
  nomorInventaris: string | null;
};

type BookRow = {
  id: string; // local unique key
  mode: 'search' | 'manual';
  // search mode
  query: string;
  suggestions: BookOption[];
  showSuggestions: boolean;
  selectedBook: BookOption | null;
  // manual mode
  manualTitle: string;
  // shared
  amount: number;
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function createEmptyRow(): BookRow {
  return {
    id: generateId(),
    mode: 'search',
    query: '',
    suggestions: [],
    showSuggestions: false,
    selectedBook: null,
    manualTitle: '',
    amount: 1,
  };
}

interface Props {
  books: BookOption[];
}

export default function OfflineLoanForm({ books }: Props) {
  const [rows, setRows] = useState<BookRow[]>([createEmptyRow()]);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenBooksRef = useRef<HTMLInputElement>(null);

  // Today's date as default borrow date
  const today = new Date().toISOString().split('T')[0];
  // Default due date: 14 days from now
  const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  function updateRow(id: string, patch: Partial<BookRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function handleQueryChange(rowId: string, value: string) {
    const q = value.toLowerCase();
    const suggestions = q.length >= 1
      ? books.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.nomorInventaris && b.nomorInventaris.toLowerCase().includes(q))
        ).slice(0, 8)
      : [];
    updateRow(rowId, { query: value, suggestions, showSuggestions: true, selectedBook: null });
  }

  function selectSuggestion(rowId: string, book: BookOption) {
    updateRow(rowId, {
      query: book.title,
      selectedBook: book,
      suggestions: [],
      showSuggestions: false,
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    // Build books JSON
    const bookItems = rows.map((row) => {
      if (row.mode === 'search') {
        if (!row.selectedBook) return null;
        return { bookId: row.selectedBook.id, title: row.selectedBook.title, amount: row.amount };
      } else {
        if (!row.manualTitle.trim()) return null;
        return { title: row.manualTitle.trim(), amount: row.amount };
      }
    });

    const valid = bookItems.every(Boolean);
    if (!valid) {
      setStatus('error');
      setMessage('Pastikan semua buku sudah dipilih atau diisi judulnya.');
      return;
    }

    // Inject books JSON into hidden input
    if (hiddenBooksRef.current) {
      hiddenBooksRef.current.value = JSON.stringify(bookItems);
    }

    setStatus('idle');
    startTransition(async () => {
      try {
        const data = new FormData(form);
        await createOfflineLoan(data);
        setStatus('success');
        setMessage('Peminjaman offline berhasil dicatat!');
        setRows([createEmptyRow()]);
        formRef.current?.reset();
      } catch (err: unknown) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    });
  }

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20';

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* Borrower Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Peminjam</label>
        <input
          name="borrowerName"
          placeholder="Nama lengkap peminjam"
          required
          className={inputCls}
        />
      </div>

      {/* Borrow & Due Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Pinjam</label>
          <input
            name="borrowDate"
            type="date"
            defaultValue={today}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Kembali</label>
          <input
            name="dueDate"
            type="date"
            defaultValue={defaultDue}
            required
            className={inputCls}
          />
        </div>
      </div>

      {/* Book rows */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Daftar Buku</label>
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {/* Row header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Buku {idx + 1}</span>
                <div className="flex gap-2 items-center">
                  {/* Mode toggle */}
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => updateRow(row.id, { mode: 'search', manualTitle: '' })}
                      className={`px-2.5 py-1 font-semibold transition ${
                        row.mode === 'search'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Cari Katalog
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRow(row.id, { mode: 'manual', query: '', selectedBook: null, suggestions: [], showSuggestions: false })}
                      className={`px-2.5 py-1 font-semibold transition ${
                        row.mode === 'manual'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Book input + amount */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {row.mode === 'search' ? (
                    <>
                      <input
                        value={row.query}
                        onChange={(e) => handleQueryChange(row.id, e.target.value)}
                        onFocus={() => updateRow(row.id, { showSuggestions: true })}
                        onBlur={() => setTimeout(() => updateRow(row.id, { showSuggestions: false }), 150)}
                        placeholder="Cari judul, penulis, atau no. inventaris…"
                        className={inputCls}
                      />
                      {row.showSuggestions && row.suggestions.length > 0 && (
                        <ul className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg text-xs">
                          {row.suggestions.map((book) => (
                            <li
                              key={book.id}
                              onMouseDown={() => selectSuggestion(row.id, book)}
                              className="cursor-pointer px-3 py-2 hover:bg-indigo-50 flex justify-between gap-2"
                            >
                              <span className="font-medium text-slate-800 truncate">{book.title}</span>
                              <span className="text-slate-400 shrink-0">{book.author}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {row.selectedBook && (
                        <p className="mt-1 text-xs text-emerald-600 font-medium">
                          ✓ {row.selectedBook.title} — {row.selectedBook.author}
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      value={row.manualTitle}
                      onChange={(e) => updateRow(row.id, { manualTitle: e.target.value })}
                      placeholder="Judul buku (masukkan manual)"
                      className={inputCls}
                    />
                  )}
                </div>
                {/* Amount */}
                <div className="w-20 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={row.amount}
                    onChange={(e) => updateRow(row.id, { amount: Math.max(1, Number(e.target.value)) })}
                    className={`${inputCls} text-center`}
                    title="Jumlah eksemplar"
                    placeholder="Jml"
                  />
                  <p className="text-center text-[10px] text-slate-400 mt-0.5">Jml</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add book row */}
        <button
          type="button"
          onClick={addRow}
          className="mt-2 w-full rounded-xl border border-dashed border-indigo-300 py-2 text-xs font-semibold text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition"
        >
          + Tambah Buku
        </button>
      </div>

      {/* Hidden field for books JSON */}
      <input type="hidden" name="books" ref={hiddenBooksRef} />

      {/* Status message */}
      {status !== 'idle' && (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            status === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {message}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Menyimpan…' : 'Catat Peminjaman Offline'}
      </button>
    </form>
  );
}
