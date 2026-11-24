import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';
import type { SaveWord } from '@/services/readerSave';
import { loadFirstPage } from '@/services/firstPage';
import type { FirstReview, GradeAttempt, ReviewCard } from '@/services/firstReview';
import { checkAuthentication, supabase } from '@/services/supabase';
import { mapToStudyWord } from '@/utils/typeMappers';

// Local migration contract until the coordinator applies it and regenerates DB types.
type GradeDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Database['public']['Functions'] & {
      grade_first_review: {
        Args: {
          p_root: number;
          p_attempt: string;
          p_expected?: Json;
          p_grade?: string;
          p_update?: Json;
          p_previous?: string;
        };
        Returns: Json;
      };
    };
  };
};
const db = supabase as unknown as SupabaseClient<GradeDatabase>;

async function sentenceFor(word: SaveWord) {
  if (word.source === 'first_run_reader') {
    const line = loadFirstPage().sentences.find(s =>
      s.words.some(
        w => w.practice?.occurrenceId === word.occurrenceId && w.practice.rootId === word.rootId,
      ),
    );
    if (!line) throw new Error('Occurrence missing');
    let offset = 0;
    return {
      sentence: line.words.map(w => w.form).join(' '),
      translation: line.translation,
      segments: line.words
        .flatMap((word, index) => [
          ...(index ? [{ text: ' ' }] : []),
          ...(word.segments ?? [{ text: word.form }]),
        ])
        .map(segment => {
          const run = { ...segment, offset };
          offset += segment.text.length;
          return run;
        }),
    };
  }
  if (!word.articleId || !word.sentenceId) throw new Error('Missing reading anchor');
  const { data, error } = await supabase
    .from('article_sentences')
    .select('arabic, english')
    .eq('article_id', word.articleId)
    .eq('id', word.sentenceId)
    .single();
  if (error) throw error;
  return { sentence: data.arabic, translation: data.english };
}

export async function loadFirstReviewCard(owner: string, word: SaveWord): Promise<ReviewCard> {
  await checkAuthentication(owner);
  const [{ data, error }, context] = await Promise.all([
    supabase
      .from('study_words')
      .select('*, root:roots!inner(letters, meaning)')
      .eq('user_id', owner)
      .eq('root_id', word.rootId)
      .single(),
    sentenceFor(word),
  ]);
  if (error) throw error;
  if (
    !('review_revision' in data) ||
    (data.review_revision !== null && typeof data.review_revision !== 'string')
  )
    throw new Error('Review revision unavailable');
  return {
    row: mapToStudyWord({ ...data, root: null }, owner),
    revision: data.review_revision,
    letters: data.root.letters,
    meaning: data.root.meaning,
    ...context,
  };
}

export async function sendFirstReview(
  review: FirstReview,
  card: ReviewCard,
  attempt: GradeAttempt,
) {
  const { session } = await checkAuthentication(review.owner);
  const bearer = `Bearer ${session.access_token}`;
  const id = { p_root: review.word.rootId, p_attempt: attempt.id };
  const lookup = await db.rpc('grade_first_review', id).setHeader('Authorization', bearer);
  if (lookup.error) throw lookup.error;
  let data = lookup.data;
  const replayed = isObject(data) && data['status'] === 'confirmed';
  if (isObject(data) && data['status'] === 'missing') {
    const written = await db
      .rpc('grade_first_review', {
        ...id,
        p_previous: review.previous,
        p_expected: { owner: review.owner, created: card.row.created_at, revision: card.revision },
        p_grade: attempt.grade,
        p_update: { ...attempt.update },
      })
      .setHeader('Authorization', bearer);
    if (written.error) throw written.error;
    data = written.data;
  }
  if (isObject(data)) {
    if (data['status'] === 'conflict') return { status: 'conflict' as const };
    if (
      data['status'] === 'confirmed' &&
      data['attempt'] === attempt.id &&
      data['root'] === review.word.rootId &&
      data['grade'] === attempt.grade &&
      typeof data['complete'] === 'boolean' &&
      typeof data['reviewed'] === 'string' &&
      Number.isFinite(Date.parse(data['reviewed'])) &&
      typeof data['due'] === 'string' &&
      Number.isFinite(Date.parse(data['due'])) &&
      typeof data['revision'] === 'string'
    )
      return {
        status: 'confirmed' as const,
        complete: data['complete'],
        due: data['due'],
        reviewed: data['reviewed'],
        revision: data['revision'],
        replayed,
      };
  }
  throw new Error('Unconfirmed review response');
}
function isObject(data: Json): data is Record<string, Json | undefined> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
