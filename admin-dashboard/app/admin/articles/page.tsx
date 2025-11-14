'use client';

import { useEffect, useState, Suspense } from 'react';
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
import { Loader2, ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Repeat, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthorsCategories } from '@/hooks/useAuthorsCategories';
import dynamic from 'next/dynamic';

const ImagePicker = dynamic(() => import('@/components/image-picker').then(mod => ({ default: mod.ImagePicker })), {
  ssr: false,
});

const SUPABASE_STORAGE_URL =
  'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/';

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
  if (wordCount < 20) {
    return { bg: 'bg-yellow-500', text: 'text-yellow-700', label: 'Short' };
  } else if (wordCount <= 30) {
    return { bg: 'bg-green-500', text: 'text-green-700', label: 'Good' };
  } else {
    return { bg: 'bg-orange-500', text: 'text-orange-700', label: 'Long' };
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) return 'Today';

  // Yesterday
  if (diffDays === 1) return 'Yesterday';

  // All other dates - show simple format
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function hasRepeatFlags(article: Article): boolean {
  if (!article.article_sentences) return false;

  return article.article_sentences.some(
    sentence => sentence.english_repeat === true || sentence.arabic_repeat === true,
  );
}

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
  article_sentences?: Array<{
    english_repeat: boolean | null;
    arabic_repeat: boolean | null;
  }>;
};

type Author = Database['public']['Tables']['authors']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

type SortField = 'title' | 'author' | 'category' | 'summary' | 'created_at';
type SortDirection = 'asc' | 'desc' | null;

function ArticlesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { authors, categories } = useAuthorsCategories();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  const [editingImageId, setEditingImageId] = useState<number | null>(null);
  const [savingImageId, setSavingImageId] = useState<number | null>(null);

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
      const articlesRes = await supabase
        .from('articles')
        .select(
          '*, authors(name), categories(name), article_sentences(english_repeat, arabic_repeat)',
        )
        .order('created_at', { ascending: false });

      if (articlesRes.error) throw articlesRes.error;

      setArticles((articlesRes.data as Article[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = async (articleId: number, imageUrl: string) => {
    setSavingImageId(articleId);
    try {
      const { error } = await supabase
        .from('articles')
        .update({ image_url: imageUrl })
        .eq('id', articleId);

      if (error) throw error;

      // Update local state
      setArticles(prev =>
        prev.map(article =>
          article.id === articleId ? { ...article, image_url: imageUrl } : article,
        ),
      );

      setEditingImageId(null);
    } catch (error) {
      console.error('Error updating image:', error);
      alert('Failed to update image');
    } finally {
      setSavingImageId(null);
    }
  };

  const updateArticle = async (
    articleId: number,
    field: 'author_id' | 'category_id',
    value: number,
  ) => {
    setUpdatingIds(prev => new Set(prev).add(articleId));
    try {
      const { error } = await supabase
        .from('articles')
        .update({ [field]: value })
        .eq('id', articleId);

      if (error) throw error;

      // Update local state
      setArticles(prev =>
        prev.map(article => {
          if (article.id === articleId) {
            if (field === 'author_id') {
              const author = authors.find(a => a.id === value);
              return {
                ...article,
                author_id: value,
                authors: author ? { name: author.name } : null,
              };
            } else {
              const category = categories.find(c => c.id === value);
              return {
                ...article,
                category_id: value,
                categories: category ? { name: category.name } : null,
              };
            }
          }
          return article;
        }),
      );
    } catch (error) {
      console.error('Error updating article:', error);
      alert('Failed to update article');
    } finally {
      setUpdatingIds(prev => {
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
    article =>
      article.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      article.authors?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      article.categories?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
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
        case 'created_at':
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          comparison = dateA - dateB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Pagination
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, sortField, sortDirection]);

  // ESC key handler to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingImageId) {
        setEditingImageId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editingImageId]);

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
              onChange={e => setSearchTerm(e.target.value)}
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
                <TableHead className="w-20 text-center">Repeat</TableHead>
                <TableHead className="w-40">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => toggleSort('created_at')}
                  >
                    Date Added
                    {getSortIcon('created_at')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No articles found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedArticles.map(article => {
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
                      <TableCell onClick={e => e.stopPropagation()}>
                        {article.image_url ? (
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <div
                                className="relative h-12 w-20 overflow-hidden rounded bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                onClick={() => setEditingImageId(article.id)}
                              >
                                <Image
                                  src={normalizeImageUrl(article.image_url)}
                                  alt={article.title}
                                  fill
                                  className="object-cover"
                                  sizes="80px"
                                  onError={e => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                                {savingImageId === article.id && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="p-0 border-0 bg-transparent shadow-2xl">
                              <div className="relative w-[400px] h-[300px] overflow-hidden rounded-lg border-2 border-border">
                                <Image
                                  src={normalizeImageUrl(article.image_url)}
                                  alt={article.title}
                                  fill
                                  className="object-cover"
                                  sizes="400px"
                                  priority
                                />
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div
                            className="relative h-12 w-20 overflow-hidden rounded bg-muted flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() => setEditingImageId(article.id)}
                          >
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-md truncate">{article.title}</div>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select
                          value={article.author_id.toString()}
                          onValueChange={value =>
                            updateArticle(article.id, 'author_id', parseInt(value))
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {authors.map(author => (
                              <SelectItem key={author.id} value={author.id.toString()}>
                                {author.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select
                          value={article.category_id.toString()}
                          onValueChange={value =>
                            updateArticle(article.id, 'category_id', parseInt(value))
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
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
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        {hasRepeatFlags(article) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center cursor-help">
                                <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">Has sentence repeat flags</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(article.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredArticles.length)} of{' '}
              {filteredArticles.length} articles
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          Total: {articles.length} articles
        </div>
      </div>

      {/* Image Picker Modal */}
      {editingImageId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setEditingImageId(null)}
        >
          <div
            className="bg-background rounded-lg p-6 max-w-4xl w-full h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xl font-semibold">Select Image</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingImageId(null)}
              >
                Close (ESC)
              </Button>
            </div>
            <ImagePicker
              inline
              onSelect={(imageUrl) => handleImageSelect(editingImageId, imageUrl)}
              currentImage={
                articles.find((a) => a.id === editingImageId)?.image_url || ''
              }
            />
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ArticlesPageContent />
    </Suspense>
  );
}
