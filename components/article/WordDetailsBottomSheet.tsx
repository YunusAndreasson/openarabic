import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { AudioStatus } from '@/services/simpleAudioService';
import { simpleAudioService } from '@/services/simpleAudioService';
import type { SentenceWord } from '@/types/vocabulary.types';
import { COMMON_BOTTOM_SHEET_PROPS } from '@/utils/bottomSheetUtils';
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
  const [audioStatus, setAudioStatus] = useState<AudioStatus>(simpleAudioService.getStatus());

  // Configure snap points
  const snapPoints = useMemo(() => [380], []);

  // Listen for audio status changes
  useEffect(() => {
    const updateStatus = () => {
      setAudioStatus(simpleAudioService.getStatus());
    };

    // Update immediately
    updateStatus();

    // Set up polling for status updates
    const interval = setInterval(updateStatus, 200);

    return () => clearInterval(interval);
  }, []);

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

      await simpleAudioService.play(track, { immediateStatus: true });
    } catch (error) {
      console.warn('Word audio playback failed:', error);
    }
  }, [word]);

  // Handle add to study
  const handleAddToStudy = useCallback(async () => {
    if (!word) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onAddToStudy(word);
  }, [word, onAddToStudy]);

  // Use built-in backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={onClose} />
    ),
    [onClose]
  );

  // Don't render anything if not visible or no word
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
          <ThemedText type="heading1" weight="bold" style={styles.arabicTitle}>
            {word.word_form}
          </ThemedText>
          <ThemedText type="heading3" colorName="secondaryText" style={styles.englishTranslation}>
            {word.english}
          </ThemedText>
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
              title={isInStudyList ? 'Remove from Study' : 'Add to Study'}
              variant={isInStudyList ? 'outlined' : 'filled'}
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
  prevProps.isInStudyList === nextProps.isInStudyList;

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
