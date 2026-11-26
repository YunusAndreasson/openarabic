import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { Colors } from '@/constants/colors';
import { STRINGS } from '@/constants/strings';
import { loadFirstPage } from '@/services/firstPage';
import type { SaveWord } from '@/services/readerSave';
import type { StudyWord } from '@/types/vocabulary.types';
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_DAY } from '@/utils/dateTimeUtils';
import { cooldownReviewTimestampMs, createDueWordFilter } from '@/utils/newWordPacing';
import { dueTimestampMs } from '@/utils/wordClassification';
import { initialFace, type WordEntry, type WordFace } from '@/widgets/edition';

export type Occurrence = Pick<
  WordFace,
  | 'arabic'
  | 'gloss'
  | 'line'
  | 'credit'
  | 'illustrated'
  | 'passagePosition'
  | 'articleId'
  | 'sentenceId'
  | 'contextBefore'
  | 'contextAfter'
  | 'contextAccent'
> & {
  occurrenceId: number;
};
export type Occurrences = Record<string, Occurrence>;

function publicOccurrences() {
  const page = loadFirstPage();
  return page.sentences.flatMap((sentence, lineIndex) =>
    sentence.words.map((word, i) => {
      const first = Math.max(0, Math.min(i - 1, sentence.words.length - 3));
      const role = word.segments?.findLast(segment => segment.role)?.role;
      const context = sentence.words.slice(first, first + 3).map(w => w.form);
      return {
        arabic: word.form,
        gloss: word.gloss,
        credit: page.author,
        illustrated: true,
        line: context.join(' '),
        contextBefore: context.slice(0, i - first).join(' '),
        contextAfter: context.slice(i - first + 1).join(' '),
        contextAccent: role
          ? { light: Colors.light.grammar[role], dark: Colors.dark.grammar[role] }
          : undefined,
        passagePosition: `${lineIndex}.${i}`,
        occurrenceId: word.practice?.occurrenceId ?? 0,
        suggested: word.suggested,
      };
    }),
  );
}

export function savedOccurrence(word: SaveWord): Occurrence {
  const publicWord = publicOccurrences().find(
    w => w.occurrenceId === word.occurrenceId && w.arabic === word.form,
  );
  return (
    publicWord ?? {
      arabic: word.form,
      gloss: word.gloss,
      occurrenceId: word.occurrenceId,
      line: word.contextLine ?? '',
      contextBefore: word.contextBefore,
      contextAfter: word.contextAfter,
      credit: word.sourceCredit ?? '',
      illustrated: false,
      articleId: word.articleId,
      sentenceId: word.sentenceId,
    }
  );
}

const localDay = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY;
export function publicRotation(): WordFace[] {
  const words = publicOccurrences();
  const first = Math.max(
    0,
    words.findIndex(w => w.suggested),
  );
  return [...words.slice(first), ...words.slice(0, first)].map(
    ({ suggested: _suggested, occurrenceId, ...word }) => ({
      ...initialFace,
      ...word,
      key: 'public-' + (occurrenceId || word.passagePosition),
      occurrenceKey: 'public-' + (occurrenceId || word.passagePosition),
    }),
  );
}

function publicFace(now: number, installed: number, rotation = publicRotation()): WordFace {
  const offset = Math.max(0, localDay(new Date(now)) - localDay(new Date(installed)));
  return rotation[offset % rotation.length] ?? initialFace;
}

export function publicTimeline(now: number, installed: number): WordEntry[] {
  const date = new Date(now);
  const rotation = publicRotation();
  const entries = [{ date, props: publicFace(now, installed, rotation) }];
  for (let day = 1; day <= 7; day++) {
    const next = new Date(date);
    next.setHours(24 * day, 0, 0, 0);
    entries.push({ date: next, props: publicFace(+next, installed, rotation) });
  }
  return entries;
}

const stamp = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(new Date(ms).getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  });

export function lastCheckedFace(face: WordFace, kind: string): WordFace {
  return {
    ...face,
    kind,
    status: 'As of ' + stamp(face.checked),
    expires: 0,
    dueAt: 0,
    due: true,
    reveal: false,
  };
}

export interface DeckSnapshot {
  words: StudyWord[];
  checked: number;
  lastCompletedAt?: number;
  occurrences: Occurrences;
}

export function wordTimeline(
  deck: DeckSnapshot,
  generation: string,
  now: number,
  installed: number,
): WordEntry[] {
  const expiry = deck.checked + MILLISECONDS_PER_DAY;
  if (!generation || !deck.words.length || now >= expiry) return publicTimeline(now, installed);
  const unique = new Map(deck.words.map(word => [word.root_id, word]));
  const words = Array.from(unique.values(), word => ({
    word,
    dueAt: dueTimestampMs(word),
    lastReviewedAt: cooldownReviewTimestampMs(word),
  })).sort((a, b) => a.dueAt - b.dueAt || a.word.root_id - b.word.root_id);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const boundaries = new Set([+midnight]);
  const cooldown = DEFAULT_SESSION_COOLDOWN_HOURS * MILLISECONDS_PER_HOUR;
  if (deck.lastCompletedAt) boundaries.add(deck.lastCompletedAt + cooldown);
  for (const { word, dueAt, lastReviewedAt } of words) {
    boundaries.add(dueAt);
    if (word.fsrs_last_review) boundaries.add(lastReviewedAt + cooldown + 1);
  }
  const dueAtTime = (time: number) => {
    const isDue = createDueWordFilter({ nowMs: time, lastCompletedAt: deck.lastCompletedAt });
    return words.filter(({ word, dueAt, lastReviewedAt }) => isDue(word, dueAt, lastReviewedAt));
  };
  const initialDue = dueAtTime(now);
  const ordered = [...boundaries]
    .filter(t => t > now && t < expiry && Number.isFinite(t))
    .sort((a, b) => a - b);

  // For a fixed session completion, a word stays eligible once its due time
  // and any cooldown have passed. Find the first count increase without
  // rescanning the whole deck at each boundary.
  let first = 0;
  let end = ordered.length;
  while (first < end) {
    const middle = first + Math.floor((end - first) / 2);
    const boundary = ordered[middle];
    if (boundary !== undefined && dueAtTime(boundary).length === initialDue.length)
      first = middle + 1;
    else end = middle;
  }
  const firstChange = ordered[first];
  const times = [now];
  for (const t of ordered) {
    if (firstChange !== undefined && t < firstChange) continue;
    if (times.length === 1 || t - (times.at(-1) ?? now) >= 15 * 60_000) times.push(t);
    if (times.length === 7) break;
  }
  const entries = times.map(t => {
    const due = t === now ? initialDue : dueAtTime(t);
    const candidates = (due.length ? due : words).filter(
      ({ word }) => word.root?.letters || deck.occurrences[word.root_id],
    );
    const anchored = candidates.filter(({ word }) => deck.occurrences[word.root_id]);
    const pool = anchored.length ? anchored : candidates;
    const choice =
      pool[Math.max(0, localDay(new Date(t)) - localDay(new Date(installed))) % pool.length];
    if (!choice) return { date: new Date(t), props: publicFace(t, installed) };
    const { word: selected, dueAt } = choice;
    const occurrence = deck.occurrences[selected.root_id];
    const status = due.length
      ? `${due.length} due · ${stamp(t)}`
      : Number.isFinite(dueAt) && dueAt > t
        ? `Due ${stamp(dueAt)}`
        : `Checked ${stamp(deck.checked)}`;
    return {
      date: new Date(t),
      props: {
        arabic: occurrence?.arabic ?? selected.root?.letters ?? '',
        gloss: occurrence?.gloss ?? selected.root?.meaning ?? '',
        line: occurrence?.line ?? '',
        credit: occurrence?.credit ?? '',
        illustrated: occurrence?.illustrated ?? false,
        kind: STRINGS.WIDGET_PRACTICE_WORD,
        status,
        generation,
        rootId: selected.root_id,
        passagePosition: occurrence?.passagePosition,
        articleId: occurrence?.articleId,
        sentenceId: occurrence?.sentenceId,
        contextBefore: occurrence?.contextBefore,
        contextAfter: occurrence?.contextAfter,
        contextAccent: occurrence?.contextAccent,
        key: `${generation}-${selected.root_id}-${t}`,
        occurrenceKey: occurrence?.occurrenceId
          ? 'word-' + occurrence.occurrenceId
          : 'root-' + selected.root_id,
        reveal: false,
        due: due.length > 0,
        checked: deck.checked,
        dueAt: Number.isFinite(dueAt) ? dueAt : 0,
        expires: expiry,
      },
    };
  });
  const last = entries.at(-1)?.props;
  entries.push({
    date: new Date(expiry),
    props: last?.generation ? lastCheckedFace(last, 'Saved word') : publicFace(expiry, installed),
  });
  return entries;
}
