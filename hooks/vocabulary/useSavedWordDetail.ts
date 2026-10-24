import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { TextStyle } from 'react-native';

import { getArabicHeroFontSize, getArabicHeroTextStyle } from '@/constants/layout';
import { fsrsQueries, gated } from '@/constants/queries';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useAuth } from '@/hooks/auth/useAuth';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useRootEnrichment } from '@/hooks/vocabulary/useRootEnrichment';
import { useWordMemory, type WordMemory } from '@/hooks/vocabulary/useWordMemory';
import type { RootId } from '@/types/branded.types';
import type { RootEnrichment } from '@/types/rootEnrichment.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { toWordAudioData } from '@/utils/audioUtils';
import { getRootLemma } from '@/utils/stringUtils';

export interface SavedWordDetail {
  /** The saved word — held once seen, see below. */
  word: StudyWord | undefined;
  /** The saved-word list is still loading. */
  isLoading: boolean;
  /** The saved-word list failed to load. */
  error: Error | null;
  memory: WordMemory | null;
  enrichment: RootEnrichment | undefined;
  /** The lemma, `roots.letters`; empty until the word resolves. */
  arabicText: string;
  /** The gloss, capitalised; empty until the word resolves. */
  englishText: string;
  /** The debounced Arabic reading size, for a surface that sizes other Arabic off it. */
  readingFontSize: number;
  /** The headword's style at the hero size. */
  heroArabicStyle: TextStyle;
  /**
   * Whether a root-family member can be opened: only when the learner has that
   * word saved, because both word surfaces render "not in your practice list"
   * for anything else, so a link to an unsaved word is a dead end. Checked per
   * member — it used to be one all-or-nothing flag, so a single saved member
   * made all five look pressable.
   */
  canOpenFamilyMember: (memberRootId: RootId) => boolean;
  /** Plays the word's audio. Failures toast themselves, so there is nothing to await. */
  playAudio: () => void;
}

/**
 * One saved word, loaded the way both of its surfaces need it: the practice
 * tab's word screen and the `/word-detail` sheet (`WordDetailContent`). The two
 * loaded it separately, line for line, with comments asking each to mirror the
 * other.
 *
 * Only the saved-word list is read. The word screen used to subscribe to the
 * due queue as well (`useFSRSQueries`), which it never read: that filtered the
 * whole cache on mount and let the queue's own loading and errors hide a word
 * that was already there.
 *
 * Enrichment is keyed off the passed-in id, not the resolved word: the id is
 * known synchronously on mount, so it is in flight alongside the study-word
 * list rather than behind it.
 */
export function useSavedWordDetail(rootId: RootId): SavedWordDetail {
  const { user } = useAuth();
  const { data: allWords, isLoading, error } = useQuery(gated(fsrsQueries.all, user?.id));

  // Hold the last seen word, so the surface stays rendered while it dismisses
  // after the shared FSRS cache loses this root under it — a remove on this
  // exact word, from either surface or the dictionary, deletes it from the
  // cache optimistically before anything has closed. Guarded set-state during
  // render is the sanctioned "storing information from previous renders"
  // pattern.
  const found = allWords?.find(candidate => candidate.root_id === rootId);
  const [word, setWord] = useState<StudyWord | undefined>(found);
  if (found && found !== word) {
    setWord(found);
  }

  const memory = useWordMemory(word);
  const enrichment = useRootEnrichment(rootId);

  // Debounced like every other Arabic surface, so dragging the size slider does
  // not re-render the headword on every tick.
  const readingFontSize = useDebouncedArabicFontSize(100);
  const heroArabicStyle = getArabicHeroTextStyle(getArabicHeroFontSize(readingFontSize));

  const playWordAudio = useWordAudioPlayback({ showErrorToast: true });
  // Sync, with the promise explicitly discarded: `playWordAudio` catches its
  // own failures and toasts them (`showErrorToast`).
  const playAudio = () => {
    const audio = word && toWordAudioData(word);
    if (!audio) return;
    void playWordAudio(audio);
  };

  const { arabicText, englishText } = getRootLemma(word);

  const savedRootIds = new Set((allWords ?? []).map(saved => saved.root_id));
  const canOpenFamilyMember = (memberRootId: RootId) => savedRootIds.has(memberRootId);

  return {
    word,
    isLoading,
    error,
    memory,
    enrichment,
    arabicText,
    englishText,
    readingFontSize,
    heroArabicStyle,
    canOpenFamilyMember,
    playAudio,
  };
}
