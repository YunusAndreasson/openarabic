'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleCardProps {
  article: Article;
  priority?: boolean;
}

function normalizeImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/${imageUrl}`;
}

export function ArticleCard({ article, priority = false }: ArticleCardProps) {
  return (
    <Link href={`/read/${article.id}`} className="group block h-full">
      <article className="h-full flex flex-col bg-card rounded-lg overflow-hidden border border-border/40 will-change-transform transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/5 hover:border-border/60">
        {/* Image */}
        <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
          <Image
            src={normalizeImageUrl(article.image_url)}
            alt={article.title}
            fill
            className="object-cover will-change-transform transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 will-change-opacity group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content */}
        <div className="flex flex-col p-6">
          {/* Metadata - Author & Category */}
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground/80">
            <span>{article.authors?.name || 'OpenArabic'}</span>
            <span className="opacity-50">·</span>
            <span className="capitalize opacity-90">{article.categories?.name || 'General'}</span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-medium mb-3 line-clamp-2 leading-snug transition-colors duration-200">
            {article.title}
          </h2>

          {/* Summary */}
          <p className="text-muted-foreground text-sm line-clamp-4 leading-relaxed group-hover:text-foreground/70 transition-colors duration-200 min-h-[5.25rem]">
            {article.summary}
          </p>
        </div>
      </article>
    </Link>
  );
}
