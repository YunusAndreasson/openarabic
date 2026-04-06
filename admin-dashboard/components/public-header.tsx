'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Database } from '@/lib/database.types';
import { ThemeToggle } from './theme-toggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Filter, MessageCircle, Info, Mail } from 'lucide-react';

type Category = Database['public']['Tables']['categories']['Row'];

interface PublicHeaderProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

export function PublicHeader({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: PublicHeaderProps) {
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleSelectCategory = (categoryId: number | null) => {
    onSelectCategory(categoryId);
    setCategorySheetOpen(false);
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedLabel = selectedCategory?.name || 'All';

  // Auto-hide header on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show header at top of page
      if (currentScrollY < 50) {
        setIsVisible(true);
      }
      // Hide on scroll down, show on scroll up
      else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md view-transition-stable transition-transform duration-300 ease-out ${!isVisible ? '-translate-y-full' : 'translate-y-0'}`}
      style={{ viewTransitionName: 'header' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Logo + Brand Name */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 active:opacity-60 transition-opacity duration-150 group"
            title="Home"
          >
            <Image
              src="/oaLogo.png"
              alt="OpenArabic"
              width={28}
              height={28}
              className="h-7 w-auto"
              priority
            />
            <span className="text-base font-semibold text-foreground">
              OpenArabic
            </span>
          </Link>

          {/* Mobile: Category Button + Info + Contact + Theme Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setCategorySheetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/50 text-foreground hover:bg-muted transition-colors duration-150 capitalize cursor-pointer"
              aria-label="Select category"
            >
              <Filter className="h-4 w-4" />
              {selectedLabel}
            </button>
            <button
              onClick={() => setAboutDialogOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 cursor-pointer flex-shrink-0"
              title="About"
              aria-label="About OpenArabic"
            >
              <Info className="h-4 w-4" />
            </button>
            <button
              onClick={() => setContactSheetOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 cursor-pointer flex-shrink-0"
              title="Contact"
              aria-label="Contact us"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>

          {/* Desktop: Category Navigation Pills */}
          <nav className="hidden md:flex flex-1 justify-end">
            <div className="flex gap-1.5 items-center">
              {/* All Articles pill */}
              <button
                onClick={() => onSelectCategory(null)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer
                  ${
                    selectedCategoryId === null
                      ? 'bg-muted text-foreground shadow-sm ring-1 ring-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
                title="All Articles"
              >
                All
              </button>

              {/* Category pills */}
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => onSelectCategory(category.id)}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 capitalize cursor-pointer
                    ${
                      selectedCategoryId === category.id
                        ? 'bg-muted text-foreground shadow-sm ring-1 ring-border/50'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  {category.name}
                </button>
              ))}

              {/* Info + Contact + Theme Toggle */}
              <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setAboutDialogOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 cursor-pointer flex-shrink-0"
                  title="About"
                  aria-label="About OpenArabic"
                >
                  <Info className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setContactSheetOpen(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150 cursor-pointer flex-shrink-0"
                  title="Contact"
                  aria-label="Contact us"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile: Bottom Sheet for Category Selection */}
      <Dialog open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <DialogContent className="bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom w-full max-w-full rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-base font-semibold">Select Category</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1">
              {/* All Articles option */}
              <button
                onClick={() => handleSelectCategory(null)}
                className={`
                  w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 text-left
                  ${
                    selectedCategoryId === null
                      ? 'bg-foreground text-background'
                      : 'text-foreground hover:bg-muted/50 active:bg-muted'
                  }
                `}
              >
                All Articles
              </button>

              {/* Category options */}
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleSelectCategory(category.id)}
                  className={`
                    w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 text-left capitalize
                    ${
                      selectedCategoryId === category.id
                        ? 'bg-foreground text-background'
                        : 'text-foreground hover:bg-muted/50 active:bg-muted'
                    }
                  `}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Bottom Sheet */}
      <Dialog open={contactSheetOpen} onOpenChange={setContactSheetOpen}>
        <DialogContent className="bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom w-full max-w-full md:max-w-md md:bottom-auto md:top-1/2 md:left-1/2 md:translate-x-[-50%] md:translate-y-[-50%] md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:slide-out-to-bottom-0 rounded-t-2xl md:rounded-lg rounded-b-none md:rounded-b-lg border-t md:border border-x-0 md:border-x border-b-0 md:border-b p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-base font-semibold">Get in Touch</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-4">
            <div className="space-y-1">
              {/* Email */}
              <a
                href="mailto:yunus+openarabic@edenmind.com"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 active:bg-muted transition-colors duration-150"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Us
              </a>

              {/* Twitter */}
              <a
                href="https://x.com/openarabicio"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 active:bg-muted transition-colors duration-150"
              >
                <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter / X
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/openarabic.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 active:bg-muted transition-colors duration-150"
              >
                <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/OpenArabic.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 active:bg-muted transition-colors duration-150"
              >
                <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              About OpenArabic
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="text-foreground">
              A free Arabic learning app based on classical Islamic texts. You read bilingual sentence pairs (an Arabic sentence followed by an English sentence), tap words you don&apos;t understand, and add them to a spaced repetition system (FSRS) to learn over time.
            </p>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Who is this for?</h3>
              <p className="text-muted-foreground">
                Learners who can decode Arabic and want to read real texts efficiently—especially those studying with a course or who just finished one and need vocabulary to read independently.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">How does it work?</h3>
              <p className="text-muted-foreground">
                You read bilingual sentence pairs at 90-95% comprehension (i+1 level), with 5-10% new vocabulary per article. Tap unknown words to add them to spaced repetition. Regular reading builds pattern recognition without explicit grammar study.
              </p>
            </div>

            <div className="border-t border-border/40 pt-4 mt-4">
              <p className="text-xs text-muted-foreground">
                Developed by Yunus Andréasson<br />
                Contact: <a href="mailto:yunus+openarabic@edenmind.com" className="text-primary hover:underline">yunus+openarabic@edenmind.com</a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
