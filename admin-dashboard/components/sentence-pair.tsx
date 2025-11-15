'use client';

import type { Database } from '@/lib/database.types';
import { ArabicWord } from '@/components/arabic-word';

type ArticleSentence = Database['public']['Tables']['article_sentences']['Row'];
type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];

interface SentencePairProps {
  sentence: ArticleSentence;
  words: SentenceWord[];
  isLast?: boolean;
}

export function SentencePair({ sentence, words, isLast = false }: SentencePairProps) {
  return (
    <div className={`${isLast ? '' : 'mb-10'}`}>
      {/* Arabic Sentence - Primary (Word by Word) */}
      <div
        lang="ar"
        dir="rtl"
        className="text-2xl md:text-[28px] leading-[1.9] text-right text-foreground mb-4"
      >
        {words.length > 0 ? (
          words.map((word, index) => (
            <span key={word.id}>
              <ArabicWord
                wordForm={word.word_form}
                english={word.english}
                grammarNote={word.grammar_note}
              />
              {/* Add space between words */}
              {index < words.length - 1 && ' '}
            </span>
          ))
        ) : (
          // Fallback to full sentence if no words available
          <span
            style={{
              fontFamily: 'Madina, "Noto Naskh Arabic", "Traditional Arabic", serif',
              fontFeatureSettings: '"calt" 1, "liga" 1, "kern" 1',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              fontWeight: 500,
            }}
          >
            {sentence.arabic}
          </span>
        )}
      </div>

      {/* English Translation - Support */}
      <p
        lang="en"
        className="text-xl md:text-[21px] leading-[1.7] mb-5 font-serif text-foreground/70 text-left"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          letterSpacing: '0.01em',
          fontWeight: 400,
        }}
      >
        {sentence.english}
      </p>
    </div>
  );
}
