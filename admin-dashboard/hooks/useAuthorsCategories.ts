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

export function useAuthorsCategories() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try loading from localStorage cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData: CacheData = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - cacheData.timestamp < CACHE_DURATION) {
          setAuthors(cacheData.authors);
          setCategories(cacheData.categories);
          setLoading(false);
          return;
        }
      }

      // Fetch from database
      const [authorsRes, categoriesRes] = await Promise.all([
        supabase.from('authors').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (authorsRes.error) throw authorsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const authorsData = authorsRes.data || [];
      const categoriesData = categoriesRes.data || [];

      // Save to cache
      const cacheData: CacheData = {
        authors: authorsData,
        categories: categoriesData,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      setAuthors(authorsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error loading authors/categories:', err);
      setError('Failed to load authors and categories');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    localStorage.removeItem(CACHE_KEY);
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
