'use client';

import Link from 'next/link';
import type { Database } from '@/lib/database.types';

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo + Brand Name */}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSelectCategory(null);
            }}
            className="flex items-center gap-3 flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 ease-in-out group"
            title="Home - All Articles"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/oaLogo.png"
              alt="OpenArabic"
              className="h-8 w-auto transition-transform"
            />
            <span className="text-lg font-bold text-foreground hidden sm:inline group-hover:text-primary transition-colors">
              OpenArabic
            </span>
          </Link>

          {/* Category Navigation */}
          <nav className="flex-1 flex justify-end">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory max-w-full">
              {/* All Articles pill */}
              <button
                onClick={() => onSelectCategory(null)}
                style={{ cursor: 'default' }}
                className={`
                  flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 snap-start
                  ${
                    selectedCategoryId === null
                      ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
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
                  style={{ cursor: 'default' }}
                  className={`
                    flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 snap-start category-badge capitalize
                    ${
                      selectedCategoryId === category.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }
                  `}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
