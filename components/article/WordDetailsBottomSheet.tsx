import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { startTransition, useCallback, useEffect, useOptimistic } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorCodedText } from '@/components/common/ColorCodedText';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { useToast } from '@/components/providers';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useColors } from '@/hooks/theme/useColors';

import { preload } from 'expo-audio';

import { audioCache } from '@/services/audioCache';
import type { SentenceWord } from '@/types/vocabulary.types';
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
  onAddToStudy: (word: SentenceWord) => Promise<boolean>;
  isInStudyList?: boolean;
}

export function WordDetailsBottomSheet({
  isVisible,
  onClose,
  word,
  onAddToStudy,
  isInStudyList = false,
}: WordDetailsBottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const bottomSheetRef = useBottomSheetVisibility(isVisible && !!word);
  // Use consolidated word audio playback hook
  const playWordAudio = useWordAudioPlayback({ showErrorToast: true });

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

  // Handle add to study with optimistic update for instant feedback
  const handleAddToStudy = () => {
    if (!word) return;

    const newValue = !optimisticIsInStudyList;
    selectionFeedback();

    if (newValue) {
      showToast(STRINGS.WORD_ADDED_TO_PRACTICE);
    }

    startTransition(async () => {
      setOptimisticIsInStudyList(newValue);
      try {
        await onAddToStudy(word);
      } catch (error) {
        handleError(error as Error, { toastMessage: 'Failed to update study list' });
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
      handleIndicatorStyle={{ backgroundColor: colors.modalIndicator }}
    >
      <BottomSheetView
        style={[styles.container, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
      >
        {!word ? null : (
          <>
            {/* Arabic Word Title */}
            <View style={styles.titleSection}>
              <ColorCodedText
                text={cleanWordText(word.word_form || '')}
                arabicWord={cleanWordText(word.word_form || '')}
                englishTranslation={cleanWordText(word.english || '')}
                type="heading1"
                weight="bold"
                style={styles.arabicTitle}
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
                  style={styles.actionButton}
                />
                <ThemedButton
                  title={
                    optimisticIsInStudyList ? STRINGS.REMOVE_FROM_PRACTICE : STRINGS.ADD_TO_PRACTICE
                  }
                  variant={optimisticIsInStudyList ? 'outlined' : 'filled'}
                  onPress={handleAddToStudy}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </>
        )}
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
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  arabicTitle: {
    marginBottom: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE, // 34 - larger than heading1 (28)
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE * 1.58, // 60 - adequate for Arabic text with diacritics
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
  actionButton: {
    width: '100%',
  },
});
