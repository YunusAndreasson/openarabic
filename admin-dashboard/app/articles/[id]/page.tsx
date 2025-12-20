'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Upload, Sparkles } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SummaryPreviewDialog } from '@/components/summary-preview-dialog';
import { useAuthorsCategories } from '@/hooks/useAuthorsCategories';

const ImagePicker = dynamic(() => import('@/components/image-picker').then(mod => ({ default: mod.ImagePicker })), {
  loading: () => <div className="h-10 bg-muted animate-pulse rounded" />,
});

const SentenceAudioVerifier = dynamic(() => import('@/components/sentence-audio-verifier').then(mod => ({ default: mod.SentenceAudioVerifier })), {
  loading: () => <div className="h-32 bg-muted animate-pulse rounded" />,
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

type Article = Database['public']['Tables']['articles']['Row'];
type Author = Database['public']['Tables']['authors']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = parseInt(params.id as string);

  const { authors, categories } = useAuthorsCategories();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  // AI Summary Optimization state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [optimizedSummary, setOptimizedSummary] = useState<string | null>(null);
  const [originalSummary, setOriginalSummary] = useState('');
  const [originalWordCount, setOriginalWordCount] = useState(0);
  const [optimizedWordCount, setOptimizedWordCount] = useState(0);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const fetchData = async () => {
    try {
      const articleRes = await supabase.from('articles').select('*').eq('id', articleId).single();

      if (articleRes.error) throw articleRes.error;

      const articleData = articleRes.data;
      setArticle(articleData);
      setTitle(articleData.title);
      setSummary(articleData.summary);
      setAuthorId(articleData.author_id.toString());
      setCategoryId(articleData.category_id.toString());
      setDifficultyLevel(articleData.difficulty_level.toString());
      setImageUrl(articleData.image_url);
      setImagePreview(normalizeImageUrl(articleData.image_url));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSelect = (selectedImageUrl: string) => {
    setImageUrl(selectedImageUrl);
    setImagePreview(selectedImageUrl);
    setImageFile(null); // Clear any uploaded file
  };

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleOptimizeSummary = () => {
    const wordCount = countWords(summary);
    setOriginalSummary(summary);
    setOriginalWordCount(wordCount);
    setShowPreviewDialog(true);
    setOptimizedSummary(null);
  };

  const handleStartOptimization = async () => {
    const wordCount = countWords(summary);
    setIsOptimizing(true);

    try {
      const response = await fetch('/api/ai/optimize-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          currentSummary: summary,
          wordCount,
          title,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to optimize summary');
      }

      setOptimizedSummary(data.optimizedSummary);
      setOptimizedWordCount(data.wordCount);
    } catch (error) {
      console.error('Error optimizing summary:', error);
      alert(error instanceof Error ? error.message : 'Failed to optimize summary');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleOptimizedSummaryChange = (value: string) => {
    setOptimizedSummary(value);
    setOptimizedWordCount(countWords(value));
  };

  const handleSaveSummary = () => {
    if (!optimizedSummary) return;

    // Update the form state with the optimized summary
    setSummary(optimizedSummary);

    // Close dialog
    setShowPreviewDialog(false);
    setOptimizedSummary(null);
  };

  const handleCancelOptimization = () => {
    setShowPreviewDialog(false);
    setOptimizedSummary(null);
    setIsOptimizing(false);
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return imageUrl;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('images').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalImageUrl = imageUrl;

      // Upload new image if selected
      if (imageFile) {
        finalImageUrl = await uploadImage();
      }

      const { error } = await supabase
        .from('articles')
        .update({
          title,
          summary,
          author_id: parseInt(authorId),
          category_id: parseInt(categoryId),
          difficulty_level: parseInt(difficultyLevel),
          image_url: finalImageUrl,
        })
        .eq('id', articleId);

      if (error) throw error;

      router.push('/admin/articles');
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Article not found</p>
        <Link href="/">
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to articles
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold">Edit Article</h2>
          <p className="text-sm text-muted-foreground">Article ID: {articleId}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="Article title"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="summary">Summary</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOptimizeSummary}
              disabled={!summary.trim()}
              className="cursor-pointer"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Optimize with AI
            </Button>
          </div>
          <Textarea
            id="summary"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            required
            placeholder="Article summary"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {countWords(summary)} words (target: 20-30 words)
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Select value={authorId} onValueChange={setAuthorId} required>
              <SelectTrigger id="author">
                <SelectValue placeholder="Select author" />
              </SelectTrigger>
              <SelectContent>
                {authors.map(author => (
                  <SelectItem key={author.id} value={author.id.toString()}>
                    {author.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficultyLevel} onValueChange={setDifficultyLevel} required>
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Beginner</SelectItem>
                <SelectItem value="2">2 - Elementary</SelectItem>
                <SelectItem value="3">3 - Intermediate</SelectItem>
                <SelectItem value="4">4 - Upper Intermediate</SelectItem>
                <SelectItem value="5">5 - Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={saving || uploading} className="flex-1 cursor-pointer">
            {saving || uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          <Link href="/">
            <Button type="button" variant="outline" className="cursor-pointer">
              Cancel
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Image</Label>
          <div className="space-y-4">
            {imagePreview && (
              <div className="relative w-full overflow-hidden rounded-lg border bg-muted">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <Image
                    src={imagePreview}
                    alt="Article preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 768px"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <ImagePicker onSelect={handleImageSelect} currentImage={imageUrl} />
              <div className="relative">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button type="button" variant="outline" className="w-full pointer-events-none">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Image
                </Button>
              </div>
            </div>

            {imageFile && (
              <p className="text-sm text-muted-foreground">New file selected: {imageFile.name}</p>
            )}

            <p className="text-xs text-muted-foreground">
              Select an existing image from the library or upload a new one
            </p>
          </div>
        </div>
      </form>

      {/* Sentence Audio Verification */}
      <div className="mt-8 border-t pt-6">
        <SentenceAudioVerifier articleId={articleId} />
      </div>

      <SummaryPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        originalSummary={originalSummary}
        optimizedSummary={optimizedSummary}
        originalWordCount={originalWordCount}
        optimizedWordCount={optimizedWordCount}
        isOptimizing={isOptimizing}
        onSave={handleSaveSummary}
        onCancel={handleCancelOptimization}
        onOptimizedSummaryChange={handleOptimizedSummaryChange}
        onStartOptimization={handleStartOptimization}
      />
    </div>
  );
}
