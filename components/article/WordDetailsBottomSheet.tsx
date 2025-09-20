import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { AudioStatus } from '@/services/simpleAudioService';
import { simpleAudioService } from '@/services/simpleAudioService';
import type { SentenceWord } from '@/types/vocabulary.types';
import { COMMON_BOTTOM_SHEET_PROPS, useBottomSheetBackdrop } from '@/utils/bottomSheetUtils';
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
  const [audioStatus, setAudioStatus] = useState<AudioStatus>(simpleAudioService.getStatus());
  const [optimisticIsInStudyList, setOptimisticIsInStudyList] = useState(isInStudyList);
  const [optimisticIsVisible, setOptimisticIsVisible] = useState(isVisible);

  // Use Arabic word analysis for color-coding
  const { hasComponents, coloredSegments, formattedAnalysis, analysis } = useArabicWordAnalysis(
    word?.word_form || '',
    word?.english || '',
    true
  );

  // Sync optimistic states with props when they change (from external updates)
  useEffect(() => {
    setOptimisticIsInStudyList(isInStudyList);
  }, [isInStudyList]);

  // Optimistic visibility - show modal immediately when isVisible becomes true
  useEffect(() => {
    setOptimisticIsVisible(isVisible);
  }, [isVisible]);

  // Configure snap points
  const snapPoints = useMemo(() => [380], []);

  // Color mapping for consistency with WordTooltip
  const colorMapping = useMemo(
    () => ({
      tint: colors.tint,
      primary: colors.primary,
      warning: colors.warning,
      secondaryText: colors.secondaryText,
      text: colors.text,
    }),
    [colors]
  );

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

  // Render color-coded English text
  const renderColorCodedEnglish = useMemo(() => {
    if (!word?.english) return null;

    // Single words should never have grammar color-coding
    const wordCount = word.english.trim().split(/\s+/).length;
    if (wordCount === 1) {
      return (
        <ThemedText type="heading3" colorName="secondaryText" style={styles.englishTranslation}>
          {word.english}
        </ThemedText>
      );
    }

    if (!formattedAnalysis?.sections?.length) {
      return (
        <ThemedText type="heading3" colorName="secondaryText" style={styles.englishTranslation}>
          {word.english}
        </ThemedText>
      );
    }

    const originalEnglish =
      formattedAnalysis.sections.find(s => s.type === 'original')?.content || word.english;

    const componentSections = formattedAnalysis.sections.filter(s => s.type === 'components');

    if (!componentSections.length) {
      return (
        <ThemedText type="heading3" colorName="secondaryText" style={styles.englishTranslation}>
          {originalEnglish}
        </ThemedText>
      );
    }

    const matchPositions: { start: number; end: number; color: string }[] = [];

    // Add bracket color coding for [the] injection
    if (analysis?.hasBracketInjection) {
      const bracketMatch = originalEnglish.match(/^\[the\]/);
      if (bracketMatch) {
        matchPositions.push({
          start: 0,
          end: 6, // "[the]" length
          color: colors.tint, // Use tint color for brackets
        });
      }
    }

    for (const section of componentSections) {
      if (!section.englishPart) continue;

      const searchText = originalEnglish.toLowerCase();
      const colorKey = section.colorName as keyof typeof colorMapping;
      const colorValue = colorMapping[colorKey] || colors.text;

      // Split possible multiple english matches like "his / its / it"
      const candidates = section.englishPart
        .toLowerCase()
        .split('/')
        .map(s => s.trim())
        .filter(Boolean);

      // Track duplicates (start:end) to avoid overlapping duplicates
      const seen = new Set<string>();
      for (const candidate of candidates) {
        let fromIndex = 0;
        while (fromIndex <= searchText.length) {
          const idx = searchText.indexOf(candidate, fromIndex);
          if (idx === -1) break;

          const prevChar = idx > 0 ? searchText[idx - 1] ?? ' ' : ' ';
          const nextIdx = idx + candidate.length;
          const nextChar = nextIdx < searchText.length ? searchText[nextIdx] ?? ' ' : ' ';
          const isValidMatch =
            idx === 0 ||
            !/[a-z]/.test(prevChar) ||
            nextIdx === searchText.length ||
            !/[a-z]/.test(nextChar);

          if (isValidMatch) {
            const key = `${idx}:${idx + candidate.length}`;
            if (!seen.has(key)) {
              seen.add(key);
              matchPositions.push({
                start: idx,
                end: idx + candidate.length,
                color: colorValue,
              });
            }
            // Move past this match to find further non-overlapping matches
            fromIndex = idx + candidate.length;
          } else {
            fromIndex = idx + 1;
          }
        }
      }
    }

    const sortedMatches = matchPositions
      .sort((a, b) => a.start - b.start)
      .filter((match, i, arr) => i === 0 || match.start >= (arr[i - 1]?.end ?? 0));

    const parts: { text: string; color: string; key: string }[] = [];
    let currentIndex = 0;

    for (const match of sortedMatches) {
      if (match.start > currentIndex) {
        parts.push({
          text: originalEnglish.substring(currentIndex, match.start),
          color: colors.secondaryText,
          key: `text-${currentIndex}`,
        });
      }
      parts.push({
        text: originalEnglish.substring(match.start, match.end),
        color: match.color,
        key: `match-${match.start}`,
      });
      currentIndex = match.end;
    }

    if (currentIndex < originalEnglish.length) {
      parts.push({
        text: originalEnglish.substring(currentIndex),
        color: colors.secondaryText,
        key: 'remaining',
      });
    }

    return (
      <ThemedText type="heading3" style={styles.englishTranslation}>
        {parts.map(part => (
          <ThemedText
            key={part.key}
            type="heading3"
            skipDefaultColor
            style={[styles.englishTranslation, { color: part.color }]}
          >
            {part.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  }, [word?.english, formattedAnalysis, colorMapping, colors.secondaryText, colors.text]);

  // Listen for audio status changes
  useEffect(() => {
    const updateStatus = () => {
      setAudioStatus(simpleAudioService.getStatus());
    };

    // Update immediately
    updateStatus();

    // Set up polling for status updates
    const interval = setInterval(updateStatus, TIMING_CONFIG.POLLING.interval);

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

      // Stop any currently playing article audio before starting word audio
      await simpleAudioService.stop();

      await simpleAudioService.play(track, { immediateStatus: true });
    } catch (error) {
      handleError(error as Error, { toastMessage: 'Word audio playback failed' });
    }
  }, [word]);

  // Handle add to study with optimistic update
  const handleAddToStudy = useCallback(async () => {
    if (!word) return;

    // Optimistic update - immediately show the new state
    setOptimisticIsInStudyList(!optimisticIsInStudyList);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await onAddToStudy(word);
      // Success - the optimistic state should match the actual state now
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticIsInStudyList(optimisticIsInStudyList);
      handleError(error as Error, { toastMessage: 'Failed to update study list' });
    }
  }, [word, onAddToStudy, optimisticIsInStudyList]);

  // Use common backdrop component
  const renderBackdrop = useBottomSheetBackdrop(onClose);

  // Don't render anything if not visible or no word (use optimistic visibility for immediate feedback)
  if (!optimisticIsVisible || !word) {
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
