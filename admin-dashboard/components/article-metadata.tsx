import type { Database } from '@/lib/database.types';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleMetadataProps {
  article: Article;
}

/**
 * Client-side metadata injection for dynamic article pages
 * Updates document head with Open Graph and Twitter Card tags
 */
export function ArticleMetadata({ article }: ArticleMetadataProps) {
  // Update meta tags on mount
  if (typeof window !== 'undefined') {
    // Title
    document.title = `${article.title} - OpenArabic`;

    // Description
    updateMetaTag('description', article.summary);

    // Open Graph
    updateMetaTag('og:title', article.title, 'property');
    updateMetaTag('og:description', article.summary, 'property');
    updateMetaTag('og:type', 'article', 'property');
    updateMetaTag('og:url', window.location.href, 'property');
    updateMetaTag('og:image', `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/${article.image_url}`, 'property');
    updateMetaTag('article:published_time', article.created_at, 'property');
    updateMetaTag('article:author', article.authors?.name || 'OpenArabic', 'property');
    updateMetaTag('article:section', article.categories?.name || 'General', 'property');

    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', article.title);
    updateMetaTag('twitter:description', article.summary);
    updateMetaTag('twitter:image', `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/${article.image_url}`);
  }

  return null; // This component doesn't render anything
}

function updateMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let meta = document.querySelector(`meta[${attr}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}
