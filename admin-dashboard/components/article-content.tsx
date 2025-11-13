'use client';

import { ReactNode } from 'react';

interface ArticleContentProps {
  children: ReactNode;
  summary?: string;
}

export function ArticleContent({ children, summary }: ArticleContentProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-20">
      {/* Summary (if provided) */}
      {summary && (
        <div className="mb-12 pb-8 border-b border-border">
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed italic">
            {summary}
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-card rounded-xl p-8 md:p-12 shadow-sm border border-border">
        {children}
      </div>
    </div>
  );
}
