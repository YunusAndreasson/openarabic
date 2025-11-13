'use client';

import type { Database } from '@/lib/database.types';

type ArticleSentence = Database['public']['Tables']['article_sentences']['Row'];

interface SentencePairProps {
  sentence: ArticleSentence;
  isLast?: boolean;
}

export function SentencePair({ sentence, isLast = false }: SentencePairProps) {
  return (
    <div className={`${isLast ? '' : 'mb-10'}`}>
      {/* English Sentence */}
      <p
        lang="en"
        className="text-lg leading-relaxed mb-3 font-serif text-foreground"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {sentence.english}
      </p>

      {/* Arabic Sentence */}
      <p
        lang="ar"
        dir="rtl"
        className="text-lg leading-loose text-right text-muted-foreground"
        style={{ fontFamily: '"Noto Naskh Arabic", "Traditional Arabic", serif' }}
      >
        {sentence.arabic}
      </p>

      {/* Divider (except for last sentence) */}
      {!isLast && <div className="mt-10 border-t border-border" />}
    </div>
  );
}
