import { BottomSheetErrorBoundary, ColorCodedText } from '@/components/common';
import { BrandedBottomSheetHandle } from '@/components/ui';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
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

import { preload } from 'expo-audio';

import { audioCache } from '@/services/audioCache';
import type { SentenceWord, StudyWordIntent } from '@/types/vocabulary.types';
import { useBottomSheetVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_PROPS } from '@/utils/bottomSheetUtils';
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
  const bottomSheetRef = useBottomSheetVisibility(isVisible && !!word);
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
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      {...COMMON_BOTTOM_SHEET_PROPS}
      enableDynamicSizing={true}
      onClose={onClose}
      backdropComponent={BottomSheetBackdrop}
      backgroundStyle={[styles.background, { backgroundColor: colors.elevation1 }]}
      handleComponent={BrandedBottomSheetHandle}
    >
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
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
              </View>

              {/* Grammar Note */}
              {word.grammar_note && (
                <View style={styles.grammarSection}>
                  <ThemedText type="body" style={styles.grammarText}>
                    {word.grammar_note}
                  </ThemedText>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonSection}>
                <View style={styles.buttonContainer}>
                  <ThemedButton
                    title={STRINGS.PLAY_AUDIO}
                    variant="outlined"
                    onPress={handlePlayAudio}
                    disabled={!word.audio_url}
                    fullWidth
                  />
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
              </View>
            </>
          )}
        </BottomSheetErrorBoundary>
      </BottomSheetView>
    </BottomSheet>
  );
}

WordDetailsBottomSheet.displayName = 'WordDetailsBottomSheet';

const styles = StyleSheet.create({
  background: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  container: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  titleSection: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  englishTranslation: {
    textAlign: 'center',
    // Font size handled by ThemedText type="heading3"
  },
  grammarSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },

  grammarText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    textAlign: 'center',
  },
  buttonSection: {
    marginTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  buttonContainer: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
});
