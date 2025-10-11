import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useAudioSubscription } from '@/hooks/audio/useAudioSubscription';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import { simpleAudioService } from '@/services/simpleAudioService';
import type { SentenceWord } from '@/types/vocabulary.types';
import { COMMON_BOTTOM_SHEET_PROPS, useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { handleError } from '@/utils/errorHandling';
import { generateAudioUrl } from '@/utils/imageUtils';

export interface WordDetailsBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  word: SentenceWord | null;
  onAddToStudy: (word: SentenceWord) => Promise<void>;
  isInStudyList?: boolean;
}

const WordDetailsBottomSheetComponent = ({
  isVisible,
  onClose,
  word,
  onAddToStudy,
  isInStudyList = false,
}: WordDetailsBottomSheetProps) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colors = useColors();
  const { status: audioStatus } = useAudioSubscription();

  // Optimistic state for instant UI feedback
  const [optimisticIsInStudyList, setOptimisticIsInStudyList] = useState(isInStudyList);

  // Sync optimistic state with prop changes
  useEffect(() => {
    setOptimisticIsInStudyList(isInStudyList);
  }, [isInStudyList]);

  // Use Arabic word analysis for color-coding
  const { hasComponents, coloredSegments, formattedAnalysis, analysis } = useArabicWordAnalysis(
    word?.word_form || '',
    word?.english || '',
    true
  );

  // Configure snap points
  const snapPoints = useMemo(() => [380], []);

  // Render color-coded Arabic text
  const renderColorCodedArabic = useMemo(() => {
    if (!hasComponents || !coloredSegments.length) {
      return (
        <ThemedText type="heading1" weight="bold" style={styles.arabicTitle} colorName="arabicText">
          {word?.word_form}
        </ThemedText>
      );
    }

    return (
      <ThemedText type="heading1" weight="bold" style={styles.arabicTitle}>
        {coloredSegments.map(segment => (
          <ThemedText
            key={`${segment.type}-${segment.text}`}
            type="heading1"
            weight="bold"
            skipDefaultColor
            style={[styles.arabicTitle, { color: segment.color }]}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  }, [hasComponents, coloredSegments, word?.word_form, colors.arabicText]);

  // Generate color-coded segments using shared utility
  const englishColoredSegments = useMemo(() => {
    if (!word?.english) return [];
    return generateColorCodedSegments({
      text: word.english,
      formattedAnalysis,
      analysis,
      colors,
      defaultColor: colors.secondaryText,
    });
  }, [word?.english, formattedAnalysis, analysis, colors]);

  // Render color-coded English text
  const renderColorCodedEnglish = useMemo(() => {
    if (!word?.english) return null;

    return (
      <ThemedText type="heading3" style={styles.englishTranslation}>
        {englishColoredSegments.map(segment => (
          <ThemedText
            key={segment.key}
            type="heading3"
            skipDefaultColor
            style={[styles.englishTranslation, { color: segment.color }]}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  }, [word?.english, englishColoredSegments]);

  // Audio status is now provided by centralized subscription

  // Check if this word's audio is currently playing
  const isThisWordPlaying =
    audioStatus.isPlaying && audioStatus.currentTrack?.id === `word-details-${word?.id}`;
  const isThisWordLoading =
    audioStatus.isLoading && audioStatus.currentTrack?.id === `word-details-${word?.id}`;

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Handle play audio
  const handlePlayAudio = useCallback(async () => {
    if (!word?.audio_url) return;

    // Direct haptic feedback without debounce
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const fullAudioUrl = generateAudioUrl(word.audio_url);
      if (!fullAudioUrl) return;

      const track = {
        id: `word-details-${word.id}`,
        audioUrl: fullAudioUrl,
        title: word.english || word.word_form || 'Word Audio',
      };

      // Stop any currently playing article audio before starting word audio
      await simpleAudioService.stop();

      await simpleAudioService.play(track, { immediateStatus: true });
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Word audio playback failed' });
    }
  }, [word]);

  // Handle add to study with optimistic update for instant feedback
  const handleAddToStudy = useCallback(async () => {
    if (!word) return;

    // Instant UI feedback - use functional update to avoid stale closure
    setOptimisticIsInStudyList(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await onAddToStudy(word);
      // Success - optimistic state should now match actual state
    } catch (error) {
      // Revert optimistic update on error - use functional update
      setOptimisticIsInStudyList(prev => !prev);
      handleError(error as Error, { toastMessage: 'Failed to update study list' });
    }
  }, [word, onAddToStudy]);

  // Use common backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  // Don't render anything if not visible or no word (use optimistic visibility for immediate feedback)
  if (!isVisible || !word) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      style={styles.modalStyle}
      backgroundStyle={[styles.background, { backgroundColor: colors.elevation1 }]}
      handleIndicatorStyle={[styles.indicator, { backgroundColor: colors.modalIndicator }]}
      {...COMMON_BOTTOM_SHEET_PROPS}
    >
      <BottomSheetView style={styles.container}>
        {/* Arabic Word Title */}
        <View style={styles.titleSection}>
          {renderColorCodedArabic}
          {renderColorCodedEnglish}
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
              title={isThisWordPlaying ? 'Playing...' : 'Play Audio'}
              variant="outlined"
              onPress={handlePlayAudio}
              disabled={!word.audio_url || isThisWordLoading}
              loading={isThisWordLoading}
              style={styles.actionButton}
            />
            <ThemedButton
              title={optimisticIsInStudyList ? 'Remove from Study' : 'Add to Study'}
              variant={optimisticIsInStudyList ? 'outlined' : 'filled'}
              onPress={handleAddToStudy}
              style={styles.actionButton}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

// Memo comparison
const arePropsEqual = (
  prevProps: WordDetailsBottomSheetProps,
  nextProps: WordDetailsBottomSheetProps
): boolean =>
  prevProps.isVisible === nextProps.isVisible &&
  prevProps.word?.id === nextProps.word?.id &&
  prevProps.isInStudyList === nextProps.isInStudyList &&
  prevProps.onAddToStudy === nextProps.onAddToStudy;

const styles = StyleSheet.create({
  background: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    // Dynamic styling applied via colors.modalIndicator in component
  },
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
    lineHeight: 60, // Adequate line height for Arabic text with diacritics
    // Font size handled by ThemedText type="heading1"
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

const WordDetailsBottomSheet = memo(WordDetailsBottomSheetComponent, arePropsEqual);

export default WordDetailsBottomSheet;
