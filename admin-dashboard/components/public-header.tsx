'use client';

import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { ThemeToggle } from './theme-toggle';

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
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md will-change-transform supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Logo + Brand Name */}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSelectCategory(null);
            }}
            className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity duration-200 group"
            title="Home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/oaLogo.png"
              alt="OpenArabic"
              className="h-7 w-auto"
            />
            <span className="text-base font-semibold text-foreground hidden sm:inline">
              OpenArabic
            </span>
          </Link>

          {/* Category Navigation */}
          <nav className="flex-1 flex justify-end">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory max-w-full items-center">
              {/* All Articles pill */}
              <button
                onClick={() => onSelectCategory(null)}
                className={`
                  flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 snap-start cursor-pointer
                  ${
                    selectedCategoryId === null
                      ? 'bg-foreground text-background'
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
                    flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 snap-start capitalize cursor-pointer
                    ${
                      selectedCategoryId === category.id
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  {category.name}
                </button>
              ))}

              {/* Theme Toggle */}
              <div className="ml-2 flex-shrink-0">
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
