import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { ColorCodedText } from '@/components/common/ColorCodedText';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useColors } from '@/hooks/theme/useColors';
import { audioCache } from '@/services/audioCache';
import type { SentenceWord } from '@/types/vocabulary.types';
import { useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';
import { generateAudioUrl } from '@/utils/imageUtils';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface WordDetailsBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  word: SentenceWord | null;
  onAddToStudy: (word: SentenceWord) => Promise<void>;
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
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Calculate snap points - use larger value to accommodate content
  const snapPoints = useMemo(() => [SCREEN_HEIGHT * 0.5], []);

  // Use consolidated word audio playback hook
  const playWordAudio = useWordAudioPlayback({
    showErrorToast: true,
    errorMessage: 'Word audio playback failed',
  });

  // Control sheet visibility using imperative methods with proper lifecycle
  useEffect(() => {
    if (isVisible && word) {
      // Snap to first snap point to show
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      // Close the sheet
      bottomSheetRef.current?.close();
    }
  }, [isVisible, word]);

  // Optimistic state for instant UI feedback
  const [optimisticIsInStudyList, setOptimisticIsInStudyList] = useState(isInStudyList);

  // OPTIMIZED: Sync optimistic state with prop changes only when value actually changes
  // This prevents unnecessary re-renders when prop object changes but value is the same
  useEffect(() => {
    setOptimisticIsInStudyList(prev => {
      // Only update if value actually changed - prevents extra render
      if (prev !== isInStudyList) {
        return isInStudyList;
      }
      return prev;
    });
  }, [isInStudyList]);

  // Prefetch and cache audio when sheet opens for instant playback
  useEffect(() => {
    if (!isVisible || !word?.audio_url) return;

    const prefetchAudio = async () => {
      try {
        const fullAudioUrl = generateAudioUrl(word.audio_url);
        if (!fullAudioUrl) return;

        // Prefetch and cache audio in background - no await to avoid blocking
        audioCache.getAudio(fullAudioUrl).catch(() => {
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
  const handleAddToStudy = async () => {
    if (!word) return;

    // Instant UI feedback - use functional update to avoid stale closure
    setOptimisticIsInStudyList(prev => !prev);
    lightFeedback();

    try {
      await onAddToStudy(word);
      // Success - optimistic state should now match actual state
    } catch (error) {
      // Revert optimistic update on error - use functional update
      setOptimisticIsInStudyList(prev => !prev);
      handleError(error as Error, { toastMessage: 'Failed to update study list' });
    }
  };

  // Handle sheet dismissal via gesture or backdrop tap
  // onChange is called when sheet position changes (index becomes -1 when closed)
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  // Use common backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.background, { backgroundColor: colors.elevation1 }]}
      handleIndicatorStyle={{ backgroundColor: colors.modalIndicator }}
    >
      <BottomSheetView style={styles.container}>
        {!word ? null : (
          <>
        {/* Arabic Word Title */}
        <View style={styles.titleSection}>
          <ColorCodedText
            text={word.word_form || ''}
            arabicWord={word.word_form || ''}
            englishTranslation={word.english || ''}
            type="heading1"
            weight="bold"
            style={styles.arabicTitle}
            defaultColor={colors.arabicText}
            isArabic={true}
            precomputedSegments={word.coloredSegments}
          />
          {word.english && (
            <ColorCodedText
              text={word.english}
              arabicWord={word.word_form || ''}
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
              title="Play Audio"
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
    ...LAYOUT.BOTTOM_SHEET.STYLES.container,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
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
    lineHeight: 60, // Adequate line height for Arabic text with diacritics
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
});
