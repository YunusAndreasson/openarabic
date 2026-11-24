import type { SaveWord } from '@/services/readerSave';
import type { ArticleId } from '@/types/branded.types';
import type { SentenceWord } from '@/types/vocabulary.types';

export function articleOccurrence(
  articleId: ArticleId,
  word: SentenceWord,
  line: readonly SentenceWord[],
  credit?: string,
): SaveWord {
  const i = line.findIndex(w => w.id === word.id);
  const start = Math.max(0, Math.min(i - 1, line.length - 3));
  return {
    source: 'article',
    articleId,
    sentenceId: word.sentence_id,
    occurrenceId: word.id,
    rootId: word.root_id,
    form: word.word_form,
    gloss: word.english,
    sourceCredit: credit,
    contextLine:
      i < 0
        ? undefined
        : line
            .slice(start, start + 3)
            .map(w => w.word_form)
            .join(' '),
  };
}
