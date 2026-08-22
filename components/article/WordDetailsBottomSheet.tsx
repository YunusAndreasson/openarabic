import { BottomSheetErrorBoundary, ColorCodedText, RootExplanation } from '@/components/common';
import { BrandedBottomSheet, IconButton } from '@/components/ui';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { startTransition, useCallback, useEffect, useOptimistic, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { useToast } from '@/components/providers';
import { LAYOUT, getArabicHeroFontSize } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useRootEnrichment } from '@/hooks/vocabulary/useRootEnrichment';
import { useStudyWordByRoot } from '@/hooks/vocabulary/useStudyWordByRoot';
import { useWordMemory } from '@/hooks/vocabulary/useWordMemory';

import { preload } from 'expo-audio';

import { audioCache } from '@/services/audioCache';
import type { SentenceWord, StudyWordIntent } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { generateStorageUrl } from '@/utils/storageUtils';
import { cleanWordText } from '@/utils/stringUtils';

export interface WordDetailsBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  word: SentenceWord | null;
  onAddToStudy: (word: SentenceWord, intent: StudyWordIntent) => Promise<boolean>;
  isInStudyList?: boolean;
  isStudyStateLoading?: boolean;
}

/**
 * The grammar note for this word IN THIS SENTENCE.
 *
 * Two things share this card and they are not the same claim: the root block
 * above describes the dictionary entry, this describes the form actually on the
 * page — its voice, its mood and what triggered it, which noun a suffix reaches
 * back to. Unlabelled, as it used to be, the two read as two opinions on one
 * word; the heading is what makes them legible as a pair.
 *
 * Open, not behind a disclosure. It was collapsed on the argument that this card
 * opens on a plain word tap and must stay light — but the note is the answer to
 * the question the tap asked, and a card that makes you tap twice for it is not
 * lighter, just slower. Being plain text again also puts it back in reach of a
 * screen reader, which a labelled `Pressable` had taken it out of.
 *
 * Local to this file rather than shared: `grammar_note` has exactly one render
 * site in the app, and `components/common/` is for what two surfaces share.
 */
function SentenceNote({ note }: { note: string }) {
  return (
    <View style={styles.noteSection}>
      <ThemedText colorName="subtleLabelText" type="overline">
        {STRINGS.WORD_SENTENCE_NOTE_TITLE}
      </ThemedText>
      <ThemedText style={styles.noteText} type="body">
        {note}
      </ThemedText>
    </View>
  );
}

export function WordDetailsBottomSheet({
  isVisible,
  onClose,
  word,
  onAddToStudy,
  isInStudyList = false,
  isStudyStateLoading = false,
}: WordDetailsBottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  // What the learner's memory of this word looks like, if they have one.
  //
  // The sheet shows the INFLECTED form with its contextual gloss, but practice
  // is keyed on the ROOT — so this line describes the dictionary entry behind
  // the form, which is the same thing the add/remove button below acts on.
  // Correct, and non-obvious enough to say out loud.
  const studyWord = useStudyWordByRoot(word?.root_id ?? undefined);
  const memory = useWordMemory(studyWord);
  // Keyed on the same root the add/remove button acts on, so the explanation
  // describes the dictionary entry behind the inflected form on screen.
  const enrichment = useRootEnrichment(word?.root_id ?? undefined);
  // Use consolidated word audio playback hook
  const playWordAudio = useWordAudioPlayback({ showErrorToast: true });
  // Scales with the learner's reading size, like the review card's hero. It was
  // pinned to XXHUGE, so the setting that exists to make Arabic bigger left the
  // word they tapped to inspect at a fixed size.
  const heroFontSize = getArabicHeroFontSize(useDebouncedArabicFontSize(100));

  // React 19: useOptimistic auto-reverts when the underlying prop unchanged after the
  // transition settles, so no manual revert/sync code is needed.
  const [optimisticIsInStudyList, setOptimisticIsInStudyList] = useOptimistic(
    isInStudyList,
    (_state, newValue: boolean) => newValue,
  );

  // Prefetch and cache audio when sheet opens for instant playback
  useEffect(() => {
    if (!isVisible || !word?.audio_url) return;

    const prefetchAudio = async () => {
      try {
        const fullAudioUrl = generateStorageUrl('audio', word.audio_url);
        if (!fullAudioUrl) return;

        // Prefetch to disk cache, then buffer in native memory for instant playback
        audioCache
          .getAudio(fullAudioUrl)
          .then(localPath => preload(localPath))
          .catch(() => {
            // Silent fail for background prefetch - user can still manually play
          });
      } catch {
        // Silent fail for background prefetch
      }
    };

    prefetchAudio();
  }, [isVisible, word?.audio_url, word?.id]);

  // Handle play audio using consolidated hook
  const handlePlayAudio = useCallback(async () => {
    if (!word) return;
    await playWordAudio(word);
  }, [word, playWordAudio]);

  // Own in-flight flag for THIS mutation — `isStudyStateLoading` is the study-
  // words query's loading state, not this button's own toggle, so it doesn't
  // cover the gap while `onAddToStudy` is in flight. That gap matters most on
  // the remove path: unlike add (which closes the sheet immediately), remove
  // leaves the button up and tappable, and by the time a fast second tap
  // lands, `optimisticIsInStudyList` has usually already flipped — so the
  // second tap doesn't just re-fire the same mutation, it computes the
  // OPPOSITE `newValue` and re-adds the word the user just removed.
  const [isToggling, setIsToggling] = useState(false);

  // Handle add to study with optimistic update for instant feedback
  const handleAddToStudy = () => {
    if (!word || isStudyStateLoading || isToggling) return;

    const newValue = !optimisticIsInStudyList;
    selectionFeedback();

    // A removal always succeeds, so it can be confirmed up front — and a silent
    // removal reads as a failed save.
    //
    // An ADD can be refused: the due-backlog gate declines it while the review
    // queue is at or above DUE_BACKLOG_ADD_THRESHOLD, and the daily limit can
    // decline it too. Both already explain themselves with their own toast. This
    // used to announce "Saved to practice" BEFORE calling the mutation, so a
    // refused add told the learner it had been saved and then swallowed the
    // explanation — measured on a real account with 1,491 words due: two taps,
    // two "Saved to practice" toasts, zero rows written, no correction shown.
    // The claim now waits for the answer.
    if (!newValue) {
      showToast(STRINGS.WORD_QUICK_REMOVED);
    }

    // Closing still happens immediately, so saving keeps its one-tap feel:
    // saving is the terminal action for this sheet, and staying open only forces
    // a third interaction to get back to the text. Removal is a correction
    // rather than an exit — keep the sheet open there so the user can
    // immediately re-add if they tapped by mistake.
    if (newValue) {
      onClose();
    } else {
      setIsToggling(true);
    }

    startTransition(async () => {
      setOptimisticIsInStudyList(newValue);
      try {
        // Explicit intent: the user acted on the button label they saw, so a
        // stale study-list cache can never invert this into the opposite action
        const succeeded = await onAddToStudy(word, newValue ? 'add' : 'remove');

        if (newValue) {
          if (succeeded) {
            showToast(STRINGS.WORD_ADDED_TO_PRACTICE);
          } else {
            // Refused by a gate that has already said why. Put the optimistic
            // state back so the word does not read as saved.
            setOptimisticIsInStudyList(false);
          }
        }
      } catch (error) {
        if (newValue) setOptimisticIsInStudyList(false);
        handleError(error, { toastMessage: 'Failed to update study list' });
      } finally {
        if (!newValue) setIsToggling(false);
      }
    });
  };

  return (
    <BrandedBottomSheet isVisible={isVisible && !!word} onClose={onClose}>
      {/* BottomSheetScrollView, not BottomSheetView: expanding the family list
          or the sentence note can push the content past `maxDynamicContentSize`
          (85% of screen height), and a non-scrolling container simply clips the
          overflow — measured on a Pixel emulator, it put "Add to practice"
          below the fold with no way to reach it. Dynamic sizing still shrinks
          the sheet to the content while everything is collapsed, so the common
          case is unchanged; only the overflowing case gains a scroll. */}
      <BottomSheetScrollView
        /* iOS hands a pageSheet's interactive dismissal to any scroll view it
           contains: at contentOffset 0, a downward drag stops being a scroll and
           becomes a drag on the presented view controller. The reader IS such a
           sheet (`presentation: 'modal'`), so pulling this card down closed the
           article behind it.

           `bounces={false}` removes the top rubber-band that UIKit reads as that
           drag, which also hands the gesture cleanly to the sheet's own
           pan-down-to-close instead of leaving two recognisers to fight.

           Latent until the card grew: with content that fits, the scroll view
           has nothing to overscroll and never offers UIKit a gesture. Nothing to
           do on Android — its modal has no drag-to-dismiss. */
        bounces={false}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE },
        ]}
      >
        <BottomSheetErrorBoundary sheetName="WordDetails">
          {!word ? null : (
            <>
              {/* Arabic Word Title */}
              <View style={styles.titleSection}>
                <ColorCodedText
                  text={cleanWordText(word.word_form || '')}
                  arabicWord={cleanWordText(word.word_form || '')}
                  englishTranslation={cleanWordText(word.english || '')}
                  arabicFontSize={heroFontSize}
                  defaultColor={colors.arabicText}
                  isArabic={true}
                  precomputedSegments={word.coloredSegments}
                />
                {word.english && (
                  <ColorCodedText
                    text={cleanWordText(word.english)}
                    arabicWord={cleanWordText(word.word_form || '')}
                    type="heading3"
                    style={styles.englishTranslation}
                    defaultColor={colors.secondaryText}
                    isArabic={false}
                  />
                )}
                {/* One line, and only for a word with a review behind it.
                    A word practised forty times and one never seen used to
                    render identically here.

                    Gated on `horizonDays`, i.e. `hasBeenPractised`: a saved but
                    unpractised word carries PLACEHOLDER FSRS values, so a
                    horizon drawn from them would be a claim about a review that
                    never happened. The button already says it is in practice.

                    Nothing more than this. No difficulty, no due date, no reps —
                    the sheet's job is to keep the learner reading, and the word
                    screen is where the full account lives. */}
                {memory?.horizonDays != null && (
                  <ThemedText type="caption" colorName="textTertiary" align="center">
                    {memory.summaryLabel}
                  </ThemedText>
                )}
                {/* An icon, not a full-width button — which is what the word
                    screen already does with this exact action. As a button it
                    took a whole row and carried the same weight as "Add to
                    practice", so the card offered two equal primary actions
                    when only one of them is.

                    It sits UNDER the word rather than beside it, unlike the
                    word screen, because that hero is a left-aligned row and
                    this one is a centred title block; an icon pushed to one
                    edge of a centred block breaks the centring it belongs to.
                    Last inside the block so it never separates the word from
                    its gloss. */}
                <IconButton
                  icon="volume-high"
                  onPress={handlePlayAudio}
                  disabled={!word.audio_url}
                  backgroundColor={colors.elevation2}
                  iconColor={colors.text}
                  hapticType="light"
                  accessibilityLabel={STRINGS.PLAY_AUDIO}
                />
              </View>

              {/* The one action, directly under the word.
                  ABOVE both explanations, not below them: this is the only
                  thing here that must stay reachable without a thought, and
                  both blocks beneath it can be opened by the learner. Putting
                  it first is what lets either of them grow freely — the root
                  block used to be exiled below the buttons for exactly that
                  reason, which cost it its place in the reading order. */}
              <View style={styles.buttonSection}>
                <ThemedButton
                  title={
                    isStudyStateLoading || isToggling
                      ? STRINGS.LOADING_GENERIC
                      : optimisticIsInStudyList
                        ? STRINGS.REMOVE_FROM_PRACTICE
                        : STRINGS.ADD_TO_PRACTICE
                  }
                  variant={optimisticIsInStudyList ? 'outlined' : 'filled'}
                  onPress={handleAddToStudy}
                  disabled={isStudyStateLoading || isToggling}
                  fullWidth
                />
              </View>

              {/* No route to the word detail screen, deliberately. The reader
                  is itself a root-level modal above the tabs, and
                  `/(tabs)/practice/word` is a child of a stack whose sibling is
                  the dictionary modal — reaching it from here means either
                  tearing down the reading session or presenting modal over
                  modal, which this codebase has already been bitten by. The two
                  facts worth having fit in the blocks below. */}

              {/* Where the word comes from — the Lane's-grounded account of the
                  root, leading. It is the stronger of the two explanations and
                  the one the learner cannot get anywhere else in the reader, so
                  it goes first and its usage note is not hidden. Only the
                  family list is behind a chevron; see RootExplanation.

                  Absent entirely for a word we have no entry for. No
                  placeholder: a row that exists only to say it has nothing
                  would fire on roughly one tap in six. */}
              <View style={styles.contentSection}>
                {enrichment && <RootExplanation enrichment={enrichment} variant="sheet" />}

                {/* And why it looks like THIS, here. Scoped to the occurrence,
                    which the root block above structurally cannot be. */}
                {word.grammar_note && <SentenceNote note={word.grammar_note} />}
              </View>
            </>
          )}
        </BottomSheetErrorBoundary>
      </BottomSheetScrollView>
    </BrandedBottomSheet>
  );
}

WordDetailsBottomSheet.displayName = 'WordDetailsBottomSheet';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  titleSection: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  englishTranslation: {
    textAlign: 'center',
    // Font size handled by ThemedText type="heading3"
  },
  buttonSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },

  // Left-aligned, like every block below the hero. It was centred, which put a
  // centred paragraph directly above the left-aligned root section and read as
  // an accident rather than a choice — reported on device as "some text
  // centered and some left aligned". The rule now has no exceptions: the hero
  // (the Arabic word and its gloss) is centred because it is a title; prose and
  // lists beneath it are read and scanned, so they are left-aligned.
  // The lead lives HERE, not on whichever block happens to come first. It used
  // to ride on RootExplanation's own section margin, which meant the gap under
  // "Add to practice" was XLARGE for a word with a root record and SMALL for one
  // without — two card layouts decided by data availability.
  contentSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  noteSection: {
    gap: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.LARGE,
  },
  noteText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
  },
});
