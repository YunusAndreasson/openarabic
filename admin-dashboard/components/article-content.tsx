'use client';

import type { ReactNode } from 'react';

interface ArticleContentProps {
  children: ReactNode;
  summary?: string;
}

export function ArticleContent({ children, summary }: ArticleContentProps) {
  return (
    <article className="py-12 md:py-16 view-transition-stable" style={{ viewTransitionName: 'content' }}>
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Summary (if provided) */}
        {summary && (
          <div className="mb-12">
            <p className="text-2xl md:text-3xl text-foreground/80 leading-relaxed font-normal">
              {summary}
            </p>
          </div>
        )}

        {/* Main Content - No box, clean reading experience */}
        <div className="space-y-10">
          {children}
        </div>
      </div>
    </article>
  );
}
