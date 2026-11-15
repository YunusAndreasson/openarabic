'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Author = Database['public']['Tables']['authors']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface CacheData {
  authors: Author[];
  categories: Category[];
  timestamp: number;
}

const CACHE_KEY = 'oa3-authors-categories-cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/** Authors and categories from the 5-minute localStorage cache, or else the database. */
async function fetchAuthorsCategories(): Promise<Omit<CacheData, 'timestamp'>> {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const cacheData: CacheData = JSON.parse(cached);
    if (Date.now() - cacheData.timestamp < CACHE_DURATION) {
      return { authors: cacheData.authors, categories: cacheData.categories };
    }
  }

  const [authorsRes, categoriesRes] = await Promise.all([
    supabase.from('authors').select('*').order('name'),
    supabase.from('categories').select('*').order('name'),
  ]);

  if (authorsRes.error) throw authorsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const fresh = { authors: authorsRes.data || [], categories: categoriesRes.data || [] };
  const cacheData: CacheData = { ...fresh, timestamp: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  return fresh;
}

export function useAuthorsCategories() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Every setState runs in a promise callback, so the mount effect can call it.
  const loadData = () =>
    fetchAuthorsCategories().then(
      data => {
        setAuthors(data.authors);
        setCategories(data.categories);
        setLoading(false);
      },
      (err: unknown) => {
        console.error('Error loading authors/categories:', err);
        setError('Failed to load authors and categories');
        setLoading(false);
      },
    );

  useEffect(() => {
    loadData();
  }, []);

  const refresh = async () => {
    localStorage.removeItem(CACHE_KEY);
    setLoading(true);
    setError(null);
    await loadData();
  };

  return {
    authors,
    categories,
    loading,
    error,
    refresh,
  };
}
