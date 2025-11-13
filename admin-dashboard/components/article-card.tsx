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
    <Link href={`/read/${article.id}`} className="group block">
      <article className="h-full flex flex-col bg-card rounded-lg overflow-hidden border border-border shadow-sm transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
        {/* Image */}
        <div className="relative w-full aspect-[16/9] bg-muted overflow-hidden">
          <Image
            src={normalizeImageUrl(article.image_url)}
            alt={article.title}
            fill
            className="object-cover transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6">
          {/* Metadata - Author & Category */}
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <span className="font-medium">{article.authors?.name || 'Unknown Author'}</span>
            <span>•</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground category-badge">
              {article.categories?.name || 'Uncategorized'}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {article.title}
          </h2>

          {/* Summary */}
          <p className="text-muted-foreground text-sm line-clamp-3 flex-1 group-hover:text-foreground/70 transition-colors duration-200">
            {article.summary}
          </p>
        </div>
      </article>
    </Link>
  );
}
