'use client';

import { ReactNode } from 'react';

interface ArticleContentProps {
  children: ReactNode;
  summary?: string;
}

export function ArticleContent({ children, summary }: ArticleContentProps) {
  return (
    <article className="py-20 md:py-28">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Summary (if provided) */}
        {summary && (
          <div className="mb-16 pb-12 border-b border-border/40">
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-light">
              {summary}
            </p>
          </div>
        )}

        {/* Main Content - No box, clean reading experience */}
        <div className="space-y-12">
          {children}
        </div>
      </div>
    </article>
  );
}
