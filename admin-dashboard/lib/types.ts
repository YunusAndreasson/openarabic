import type { Database } from '@/lib/database.types';

export type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

export type Category = Database['public']['Tables']['categories']['Row'];
export type Author = Database['public']['Tables']['authors']['Row'];
