'use client';

import type { ReactNode } from 'react';

interface ArticleContentProps {
  children: ReactNode;
}

export function ArticleContent({ children }: ArticleContentProps) {
  return (
    <article className="py-12 md:py-16 view-transition-stable font-serif" style={{ viewTransitionName: 'content' }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content - No box, clean reading experience */}
        <div className="space-y-10">
          {children}
        </div>
      </div>
    </article>
  );
}
