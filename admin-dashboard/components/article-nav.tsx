'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PublicHeader } from '@/components/public-header';
import type { Database } from '@/lib/database.types';

type Category = Database['public']['Tables']['categories']['Row'];

interface ArticleNavProps {
  categories: Category[];
  selectedCategoryId: number | null;
}

/**
 * Client wrapper for PublicHeader on article pages
 * Handles category selection by navigating to homepage
 */
export function ArticleNav({ categories, selectedCategoryId }: ArticleNavProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleSelectCategory = () => {
    startTransition(() => {
      router.push('/');
    });
  };

  return (
    <PublicHeader
      categories={categories}
      selectedCategoryId={selectedCategoryId}
      onSelectCategory={handleSelectCategory}
    />
  );
}
