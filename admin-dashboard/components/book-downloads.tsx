import Link from 'next/link';
import { Download } from 'lucide-react';
import { BOOKS } from '@/lib/books';
import type { Book } from '@/lib/books';

function BookEntry({ book }: { book: Book }) {
  return (
    <div className="min-w-0">
      <Link
        href={`/books/${book.slug}`}
        className="text-sm font-medium text-foreground leading-tight hover:text-primary transition-colors"
      >
        {book.title}
      </Link>
      <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
      <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed line-clamp-2">
        {book.description}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <a
          href={book.fileUrl}
          download
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </a>
        <span className="text-xs text-muted-foreground/60">
          {book.pages} pages &middot; {book.fileSizeMb} MB
        </span>
      </div>
    </div>
  );
}

export function BookDownloads() {
  if (BOOKS.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <h3 className="text-base font-semibold text-foreground mb-4">Free Bilingual Books</h3>
      <div className="space-y-4">
        {BOOKS.map((book) => (
          <BookEntry key={book.slug} book={book} />
        ))}
      </div>
    </div>
  );
}
