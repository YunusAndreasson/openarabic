'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const SUPABASE_STORAGE_URL = 'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/';
const IMAGES_PER_PAGE = 24;

export default function ImagesPage() {
  const [images, setImages] = useState<string[]>([]);
  const [filteredImages, setFilteredImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    if (searchTerm) {
      setFilteredImages(
        images.filter((img) => img.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } else {
      setFilteredImages(images);
    }
  }, [searchTerm, images]);

  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * IMAGES_PER_PAGE;
  const endIndex = startIndex + IMAGES_PER_PAGE;
  const currentImages = filteredImages.slice(startIndex, endIndex);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('images').list('', {
        limit: 10000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      const imageFiles = (data || [])
        .filter((file) => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
        })
        .map((file) => file.name);

      setImages(imageFiles);
      setFilteredImages(imageFiles);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (imageName: string) => {
    if (!confirm(`Are you sure you want to delete "${imageName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingImages((prev) => new Set(prev).add(imageName));
    try {
      const { error } = await supabase.storage.from('images').remove([imageName]);

      if (error) throw error;

      // Remove from local state
      setImages((prev) => prev.filter((img) => img !== imageName));
      setFilteredImages((prev) => prev.filter((img) => img !== imageName));
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. It may be in use by an article.');
    } finally {
      setDeletingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageName);
        return newSet;
      });
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Images</h2>
          <p className="text-muted-foreground">
            Manage images in your library ({images.length} total)
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredImages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? 'No images found matching your search' : 'No images available'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentImages.map((imageName) => {
              const imageUrl = SUPABASE_STORAGE_URL + imageName;
              const isDeleting = deletingImages.has(imageName);

              return (
                <div
                  key={imageName}
                  className="group relative rounded-lg overflow-hidden border bg-muted"
                >
                  <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                    <Image
                      src={imageUrl}
                      alt={imageName}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteImage(imageName)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {imageName}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredImages.length)} of{' '}
              {filteredImages.length}
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
        </>
      )}
    </div>
  );
}
