import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorCodedText } from '@/components/common/ColorCodedText';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAudioSubscription } from '@/hooks/audio/useAudioSubscription';
import { useColors } from '@/hooks/theme/useColors';
import { audioCache } from '@/services/audioCache';
import { simpleAudioService } from '@/services/audioPlayer';
import type { SentenceWord } from '@/types/vocabulary.types';
import { useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';
import { generateAudioUrl } from '@/utils/imageUtils';

export interface WordDetailsBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  word: SentenceWord | null;
  onAddToStudy: (word: SentenceWord) => Promise<void>;
  isInStudyList?: boolean;
}

// Constant snap points - no need for useMemo
const SNAP_POINTS = [380];

export function WordDetailsBottomSheet({
  isVisible,
  onClose,
  word,
  onAddToStudy,
  isInStudyList = false,
}: WordDetailsBottomSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Only subscribe to audio when sheet is visible - prevents performance issues
  const { status: audioStatus } = useAudioSubscription();
  const shouldUseAudioStatus = !!(isVisible && word);

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

  // Check if this word's audio is currently playing or loading (only when visible)
  const isThisTrack =
    shouldUseAudioStatus && audioStatus.currentTrack?.id === `word-details-${word?.id}`;
  const wordAudioState = {
    isPlaying: shouldUseAudioStatus && audioStatus.isPlaying && isThisTrack,
    isLoading: shouldUseAudioStatus && audioStatus.isLoading && isThisTrack,
  };

  // Handle play audio
  const handlePlayAudio = async () => {
    if (!word?.audio_url) return;

    // Haptic feedback with debouncing
    lightFeedback();

    try {
      const fullAudioUrl = generateAudioUrl(word.audio_url);
      if (!fullAudioUrl) return;

      // Get cached local path to eliminate network latency
      const cachedAudioUrl = await audioCache.getAudio(fullAudioUrl);

      const track = {
        id: `word-details-${word.id}`,
        audioUrl: cachedAudioUrl,
        title: word.english || word.word_form || 'Word Audio',
      };

      // Play word audio with immediate feedback - polling starts with delay to prevent glitches
      await simpleAudioService.play(track, { immediateStatus: true });
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Word audio playback failed' });
    }
  };

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

  // Handle sheet position changes - sync parent state when sheet closes
  const handleChange = useCallback(
    (index: number) => {
      // onChange fires when animation completes and sheet reaches new position
      if (index === -1 && isVisible) {
        onClose(); // Update parent state
      }
    },
    [onClose, isVisible],
  );

  // Use common backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  // Memoize button section style with safe area inset
  const buttonSectionStyle = useMemo(
    () => [
      styles.buttonSection,
      {
        paddingBottom: Math.max(insets.bottom, LAYOUT.SPACING.MEDIUM),
      },
    ],
    [insets.bottom],
  );

  // Don't render without data
  if (!word) {
    return null;
  }

  return (
    <BottomSheet
      index={isVisible ? 0 : -1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose={true}
      enableOverDrag={false}
      animateOnMount={true}
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      style={styles.modalStyle}
      backgroundStyle={[styles.background, { backgroundColor: colors.elevation1 }]}
      handleIndicatorStyle={{ backgroundColor: colors.modalIndicator }}
    >
      <BottomSheetView style={styles.container}>
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
        <View style={buttonSectionStyle}>
          <View style={styles.buttonContainer}>
            <ThemedButton
              title={wordAudioState.isPlaying ? 'Playing...' : 'Play Audio'}
              variant="outlined"
              onPress={handlePlayAudio}
              disabled={!word.audio_url || wordAudioState.isLoading}
              loading={wordAudioState.isLoading}
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
      </BottomSheetView>
    </BottomSheet>
  );
}

WordDetailsBottomSheet.displayName = 'WordDetailsBottomSheet';

const styles = StyleSheet.create({
  background: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  modalStyle: {
    zIndex: LAYOUT.Z_INDEX.POPUP,
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
