'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Images, Search, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const SUPABASE_STORAGE_URL =
  'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/';
const IMAGES_PER_PAGE = 24;
const CACHE_KEY = 'image-picker-cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedImageData {
  images: string[];
  timestamp: number;
}

interface ImagePickerProps {
  onSelect: (imageUrl: string) => void;
  currentImage?: string;
}

export function ImagePicker({ onSelect, currentImage }: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [filteredImages, setFilteredImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);

  useEffect(() => {
    if (open) {
      loadImages();
    }
  }, [open]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page on search
    if (searchTerm) {
      setFilteredImages(images.filter(img => img.toLowerCase().includes(searchTerm.toLowerCase())));
    } else {
      setFilteredImages(images);
    }
  }, [searchTerm, images]);

  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);
  const startIndex = (currentPage - 1) * IMAGES_PER_PAGE;
  const endIndex = startIndex + IMAGES_PER_PAGE;
  const currentImages = filteredImages.slice(startIndex, endIndex);

  const getCachedImages = (): string[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cachedData: CachedImageData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.images;
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error reading image cache:', error);
      return null;
    }
  };

  const setCachedImages = (imageList: string[]) => {
    try {
      const cacheData: CachedImageData = {
        images: imageList,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving image cache:', error);
    }
  };

  const loadImages = async () => {
    // Try to load from cache first
    const cachedImages = getCachedImages();

    if (cachedImages && cachedImages.length > 0) {
      setImages(cachedImages);
      setFilteredImages(cachedImages);
      setTotalImages(cachedImages.length);
      return;
    }

    // No cache or expired, fetch from server
    await fetchImages();
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('images').list('', {
        limit: 10000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      const imageFiles = (data || [])
        .filter(file => {
          const ext = file.name.split('.').pop()?.toLowerCase();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
        })
        .map(file => file.name);

      // Save to cache
      setCachedImages(imageFiles);

      setImages(imageFiles);
      setFilteredImages(imageFiles);
      setTotalImages(imageFiles.length);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSelect = (imageName: string) => {
    const fullUrl = SUPABASE_STORAGE_URL + imageName;
    setSelectedImage(fullUrl);
    onSelect(fullUrl);
    setOpen(false);
  };

  const normalizeUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return SUPABASE_STORAGE_URL + url;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <Images className="mr-2 h-4 w-4" />
          Select from Library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Image</DialogTitle>
          <DialogDescription>
            Choose an image from your library ({totalImages} images available)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search images..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex-1">
              {searchTerm ? 'No images found matching your search' : 'No images available'}
            </div>
          ) : (
            <>
              <div className="overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 pr-2">
                  {currentImages.map(imageName => {
                    const imageUrl = SUPABASE_STORAGE_URL + imageName;
                    const isSelected = normalizeUrl(currentImage || '') === imageUrl;

                    return (
                      <div
                        key={imageName}
                        className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          isSelected ? 'border-primary ring-2 ring-primary' : 'border-transparent'
                        }`}
                        onClick={() => handleSelect(imageName)}
                      >
                        <Image
                          src={imageUrl}
                          alt={imageName}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 33vw, 25vw"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary rounded-full p-1">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between border-t pt-4 flex-shrink-0">
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
      </DialogContent>
    </Dialog>
  );
}
