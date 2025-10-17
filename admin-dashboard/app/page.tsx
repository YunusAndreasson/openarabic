'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SUPABASE_STORAGE_URL = 'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/';

function normalizeImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';

  // If it's already a full URL, return it
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If it's just a filename, prepend the storage URL
  return SUPABASE_STORAGE_URL + imageUrl;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getSummaryColor(wordCount: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (wordCount <= 30) {
    return { bg: 'bg-green-500', text: 'text-green-700', label: 'Good' };
  } else {
    return { bg: 'bg-orange-500', text: 'text-orange-700', label: 'Long' };
  }
}

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type Author = Database['public']['Tables']['authors']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

type SortField = 'title' | 'author' | 'category' | 'summary';
type SortDirection = 'asc' | 'desc' | null;

export default function ArticlesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState<Article[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Initialize sort state from URL params
  useEffect(() => {
    const field = searchParams.get('sortField') as SortField | null;
    const direction = searchParams.get('sortDirection') as SortDirection;

    if (field && (direction === 'asc' || direction === 'desc')) {
      setSortField(field);
      setSortDirection(direction);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [articlesRes, authorsRes, categoriesRes] = await Promise.all([
        supabase
          .from('articles')
          .select('*, authors(name), categories(name)')
          .order('created_at', { ascending: false }),
        supabase.from('authors').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (articlesRes.error) throw articlesRes.error;
      if (authorsRes.error) throw authorsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setArticles((articlesRes.data as Article[]) || []);
      setAuthors(authorsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateArticle = async (
    articleId: number,
    field: 'author_id' | 'category_id',
    value: number
  ) => {
    setUpdatingIds((prev) => new Set(prev).add(articleId));
    try {
      const { error } = await supabase
        .from('articles')
        .update({ [field]: value })
        .eq('id', articleId);

      if (error) throw error;

      // Update local state
      setArticles((prev) =>
        prev.map((article) => {
          if (article.id === articleId) {
            if (field === 'author_id') {
              const author = authors.find((a) => a.id === value);
              return { ...article, author_id: value, authors: author ? { name: author.name } : null };
            } else {
              const category = categories.find((c) => c.id === value);
              return { ...article, category_id: value, categories: category ? { name: category.name } : null };
            }
          }
          return article;
        })
      );
    } catch (error) {
      console.error('Error updating article:', error);
      alert('Failed to update article');
    } finally {
      setUpdatingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
  };

  const toggleSort = (field: SortField) => {
    let newField: SortField | null = field;
    let newDirection: SortDirection = 'asc';

    if (sortField !== field) {
      // Switching to a new field
      newField = field;
      newDirection = 'asc';
    } else if (sortDirection === 'asc') {
      newField = field;
      newDirection = 'desc';
    } else {
      // Reset sorting
      newField = null;
      newDirection = null;
    }

    setSortField(newField);
    setSortDirection(newDirection);

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    if (newField && newDirection) {
      params.set('sortField', newField);
      params.set('sortDirection', newDirection);
    } else {
      params.delete('sortField');
      params.delete('sortDirection');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  let filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.authors?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply sorting if active
  if (sortField !== null && sortDirection !== null) {
    filteredArticles = [...filteredArticles].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'author':
          comparison = (a.authors?.name || '').localeCompare(b.authors?.name || '');
          break;
        case 'category':
          comparison = (a.categories?.name || '').localeCompare(b.categories?.name || '');
          break;
        case 'summary':
          const wordsA = countWords(a.summary);
          const wordsB = countWords(b.summary);
          comparison = wordsA - wordsB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Articles</h2>
          <div className="flex items-center gap-4">
            <Input
              type="search"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Image</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => toggleSort('title')}
                  >
                    Title
                    {getSortIcon('title')}
                  </Button>
                </TableHead>
                <TableHead className="w-64">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => toggleSort('author')}
                  >
                    Author
                    {getSortIcon('author')}
                  </Button>
                </TableHead>
                <TableHead className="w-48">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => toggleSort('category')}
                  >
                    Category
                    {getSortIcon('category')}
                  </Button>
                </TableHead>
                <TableHead className="w-32">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => toggleSort('summary')}
                  >
                    Summary
                    {getSortIcon('summary')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredArticles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No articles found
                </TableCell>
              </TableRow>
            ) : (
              filteredArticles.map((article) => {
                const wordCount = countWords(article.summary);
                const summaryStatus = getSummaryColor(wordCount);
                const isUpdating = updatingIds.has(article.id);

                return (
                  <TableRow
                    key={article.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      router.push(`/articles/${article.id}`);
                    }}
                  >
                    <TableCell>
                      <div className="relative h-12 w-20 overflow-hidden rounded bg-muted flex items-center justify-center">
                        {article.image_url ? (
                          <Image
                            src={normalizeImageUrl(article.image_url)}
                            alt={article.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="max-w-md truncate">{article.title}</div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={article.author_id.toString()}
                        onValueChange={(value) =>
                          updateArticle(article.id, 'author_id', parseInt(value))
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {authors.map((author) => (
                            <SelectItem key={author.id} value={author.id.toString()}>
                              {author.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={article.category_id.toString()}
                        onValueChange={(value) =>
                          updateArticle(article.id, 'category_id', parseInt(value))
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 cursor-help">
                            <div className={`h-3 w-3 rounded-full ${summaryStatus.bg}`} />
                            <span className={`text-xs font-medium ${summaryStatus.text}`}>
                              {wordCount}w
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{summaryStatus.label}</span>
                              <span className="text-muted-foreground">({wordCount} words)</span>
                            </div>
                            <p className="text-sm">{article.summary}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredArticles.length} of {articles.length} articles
        </div>
      </div>
    </TooltipProvider>
  );
}
