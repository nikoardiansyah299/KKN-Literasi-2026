'use client';

import Link from 'next/link';

const books = [
  {
    id: 1,
    title: 'Petualangan di Hutan Ajaib',
    creator: 'Dian Kusuma',
    cover: '/img/buku1.png',
    link: '',
  },
  {
    id: 2,
    title: 'Kisah Sang Naga Baik Hati',
    creator: 'Reza Pratama',
    cover: '/img/buku2.png',
    link: '',
  },
  {
    id: 3,
    title: 'Bintang Kecil di Langit Malam',
    creator: 'Sari Indah',
    cover: '/img/buku3.png',
    link: '',
  },
  {
    id: 4,
    title: 'Teman Baru Si Kelinci',
    creator: 'Ahmad Fauzi',
    cover: '/img/buku4.png',
    link: '',
  },
  {
    id: 5,
    title: 'Dunia Dalam Kolam Ikan',
    creator: 'Mega Wulandari',
    cover: '/img/buku5.png',
    link: '',
  },
  {
    id: 6,
    title: 'Si Kupu-Kupu yang Berani',
    creator: 'Laila Fitriani',
    cover: '/img/buku6.jpg',
    link: '',
  },
  {
    id: 7,
    title: 'Rahasia Pohon Besar',
    creator: 'Budi Santoso',
    cover: '/img/buku7.png',
    link: '',
  },
  {
    id: 8,
    title: 'Petualangan Sang Kura-Kura',
    creator: 'Nina Anggraini',
    cover: '/img/buku8.png',
    link: '',
  },
  {
    id: 9,
    title: 'Mimpi Indah Sang Bintang',
    creator: 'Hendra Wijaya',
    cover: '/img/buku9.png',
    link: '',
  },
  {
    id: 10,
    title: 'Kancil dan Buaya Baik Hati',
    creator: 'Putri Ayu',
    cover: '/img/buku10.jpg',
    link: '',
  },
  {
    id: 11,
    title: 'Kebun Rahasia Nenek Sari',
    creator: 'Fajar Nugroho',
    cover: '/img/buku11.png',
    link: '',
  },
];

// Duplicate for seamless looping
const allBooks = [...books, ...books, ...books];

export default function BookCarousel() {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col items-center text-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Koleksi Pilihan
        </span>
        <p className="text-xl font-semibold text-slate-900">Buku Seru untuk Anak-Anak 📚</p>
        <p className="text-sm text-slate-500 max-w-md">
          Jelajahi buku-buku seru yang bisa kamu pinjam secara gratis di perpustakaan kami!
        </p>
      </div>

      {/* Scrolling Strip */}
      <div className="relative w-full overflow-hidden">
        {/* Left fade */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-slate-50 to-transparent" />
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-slate-50 to-transparent" />

        <div className="flex gap-5 book-scroll-track">
          {allBooks.map((book, idx) => (
            <Link
              href={book.link || '/catalog'}
              key={`${book.id}-${idx}`}
              className="book-card group flex-shrink-0 w-56 border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-400"
            >
              {/* Portrait cover image — no rounding, full cover visible */}
              <div className="relative w-full aspect-[2/3] overflow-hidden bg-slate-100">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  draggable={false}
                />
                {/* Fun badge */}
                <span className="absolute top-2 right-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900 shadow">
                  Gratis!
                </span>
              </div>

              {/* Info */}
              <div className="p-3.5 space-y-1">
                <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
                  {book.title}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {book.creator}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-5 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
        >
          Lihat semua koleksi
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <style jsx>{`
        .book-scroll-track {
          animation: scrollLeft 30s linear infinite;
          width: max-content;
        }

        .book-scroll-track:hover {
          animation-play-state: paused;
        }

        @keyframes scrollLeft {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }
      `}</style>
    </div>
  );
}
