import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { loadFirstPage } from '@/services/firstPage';
import type { SaveWord } from '@/services/readerSave';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  MILLISECONDS_PER_HOUR,
  MILLISECONDS_PER_DAY,
  normalizeTimestamp,
} from '@/utils/dateTimeUtils';
import { filterDueWords } from '@/utils/newWordPacing';
import { dueTimestampMs } from '@/utils/wordClassification';
import { initialFace, type WordEntry, type WordFace } from '@/widgets/edition';

export type Occurrence = Pick<WordFace, 'arabic' | 'gloss' | 'line' | 'credit' | 'illustrated'> & {
  occurrenceId: number;
};
export type Occurrences = Record<string, Occurrence>;

function publicOccurrences() {
  const page = loadFirstPage();
  return page.sentences.flatMap(sentence =>
    sentence.words.map((word, i) => {
      const first = Math.max(0, Math.min(i - 1, sentence.words.length - 3));
      return {
        arabic: word.form,
        gloss: word.gloss,
        credit: page.author,
        illustrated: true,
        line: sentence.words
          .slice(first, first + 3)
          .map(w => w.form)
          .join(' '),
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
      credit: word.sourceCredit ?? '',
      illustrated: false,
    }
  );
}

const localDay = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY;
function publicFace(now: number, installed: number): WordFace {
  const words = publicOccurrences();
  const offset = Math.max(0, localDay(new Date(now)) - localDay(new Date(installed)));
  const word =
    words[
      (Math.max(
        0,
        words.findIndex(w => w.suggested),
      ) +
        offset) %
        words.length
    ];
  return word
    ? {
        ...initialFace,
        arabic: word.arabic,
        gloss: word.gloss,
        line: word.line,
        credit: word.credit,
        key: 'public-' + word.arabic,
        occurrenceKey: 'public-' + (word.occurrenceId || word.arabic),
      }
    : initialFace;
}

export function publicTimeline(now: number, installed: number): WordEntry[] {
  const date = new Date(now);
  const entries = [{ date, props: publicFace(now, installed) }];
  for (let day = 1; day <= 7; day++) {
    const next = new Date(date);
    next.setHours(24 * day, 0, 0, 0);
    entries.push({ date: next, props: publicFace(+next, installed) });
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
  const words = [...new Map(deck.words.map(w => [w.root_id, w])).values()];
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const boundaries = new Set([+midnight]);
  const cooldown = DEFAULT_SESSION_COOLDOWN_HOURS * MILLISECONDS_PER_HOUR;
  if (deck.lastCompletedAt) boundaries.add(deck.lastCompletedAt + cooldown);
  for (const word of words) {
    boundaries.add(dueTimestampMs(word));
    if (word.fsrs_last_review)
      boundaries.add(Date.parse(normalizeTimestamp(word.fsrs_last_review) ?? '') + cooldown + 1);
  }
  const eligible = (time: number) =>
    filterDueWords(words, { nowMs: time, lastCompletedAt: deck.lastCompletedAt }).length;
  const initialCount = eligible(now);
  const ordered = [...boundaries]
    .filter(t => t > now && t < expiry && Number.isFinite(t))
    .sort((a, b) => a - b);
  const firstChange = ordered.find(t => eligible(t) !== initialCount);
  const times = [now];
  for (const t of ordered) {
    if (firstChange !== undefined && t < firstChange) continue;
    if (times.length === 1 || t - (times.at(-1) ?? now) >= 15 * 60_000) times.push(t);
    if (times.length === 7) break;
  }
  const entries = times.map(t => {
    const due = filterDueWords(words, { nowMs: t, lastCompletedAt: deck.lastCompletedAt });
    const candidates = (due.length ? due : words).filter(
      w => w.root?.letters || deck.occurrences[w.root_id],
    );
    const anchored = candidates.filter(w => deck.occurrences[w.root_id]);
    const pool = (anchored.length ? anchored : candidates).sort(
      (a, b) => dueTimestampMs(a) - dueTimestampMs(b) || a.root_id - b.root_id,
    );
    const selected =
      pool[Math.max(0, localDay(new Date(t)) - localDay(new Date(installed))) % pool.length];
    if (!selected) return { date: new Date(t), props: publicFace(t, installed) };
    const occurrence = deck.occurrences[selected.root_id];
    const dueAt = dueTimestampMs(selected);
    const isDue = due.some(w => w.root_id === selected.root_id);
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
        kind: t > now ? 'Saved plan' : 'Practice word',
        status,
        generation,
        key: `${generation}-${selected.root_id}-${t}`,
        occurrenceKey: occurrence?.occurrenceId
          ? 'word-' + occurrence.occurrenceId
          : 'root-' + selected.root_id,
        reveal: false,
        due: isDue,
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
