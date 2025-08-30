import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import type { LayoutChangeEvent, LayoutRectangle, TextStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { DEFAULT_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWord, useArabicWordAnalysis } from '@/hooks/vocabulary';
import { simpleAudioService } from '@/services/simpleAudioService';
import { useAppSelectorMemo } from '@/store/hooks';
import type { TextWeight } from '@/types/ui/text.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';
import { generateAudioUrl } from '@/utils/imageUtils';
import { getSelectedStyle, type ArabicWordColors } from '@/utils/textStyleUtils';

interface ArabicWordProps {
  word: SentenceWord;
  onTooltipOpen: (layout: LayoutRectangle) => void;
  position?: number;
  settings: {
    fontScale: number;
  };
  wordRef?: RefObject<ComponentRef<typeof TouchableOpacity>>;
  isDueWord?: boolean;
  testID?: string;
}

function ArabicWordComponent({
  word,
  onTooltipOpen,
  position,
  settings,
  wordRef,
  isDueWord = false,
  testID,
}: ArabicWordProps) {
  const colors = useColors();
  const wordAudioEnabled = useAppSelectorMemo(state => state.settings.wordAudioEnabled);
  const [absoluteLayout, setAbsoluteLayout] = useState<LayoutRectangle | null>(null);

  // Use our existing hook for word selection state
  const { isSelected } = useArabicWord({
    word,
    position,
  });

  // Use the new analysis hook for color-coding
  const { hasComponents, coloredSegments } = useArabicWordAnalysis(
    word.word_form,
    word.english || '',
    true // Always enabled for now
  );

  // Use opacity animation for border
  const { setOpacity: setBorderOpacity } = useOpacityAnimation({
    initialOpacity: isSelected ? 1 : 0,
    duration: DEFAULT_ANIMATION_DURATION,
  });

  // Update border opacity when selection changes
  useEffect(() => {
    setBorderOpacity(isSelected ? 1 : 0);
  }, [isSelected, setBorderOpacity]);

  // Capture layout and measure absolute position
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const layoutRect = event.nativeEvent.layout;

      // Immediately set the relative layout as fallback
      setAbsoluteLayout(layoutRect);

      // Then try to get absolute coordinates asynchronously
      if (wordRef?.current) {
        // Small delay to ensure the layout is fully rendered
        setTimeout(() => {
          wordRef.current?.measureInWindow((x, y, width, height) => {
            if (x !== undefined && y !== undefined && width > 0 && height > 0) {
              setAbsoluteLayout({ x, y, width, height });
            }
          });
        }, 0);
      }
    },
    [wordRef]
  );

  // Pre-calculate text size once when component mounts (will never change)
  const calculatedFontSize = useMemo(
    () => settings.fontScale * LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    [settings.fontScale]
  );

  // Base text props for Arabic text
  const baseTextProps = useMemo(
    () => ({
      type: 'arabic' as const,
      skipDefaultColor: true, // We'll handle colors manually
      arabicFontSize: calculatedFontSize,
      weight: (isSelected ? 'semibold' : 'normal') as TextWeight,
      style: styles.textStyle as TextStyle,
    }),
    [isSelected, calculatedFontSize]
  );

  // Handle word audio playback
  const handleWordAudio = useCallback(async () => {
    if (!word.audio_url || !wordAudioEnabled) return;

    try {
      const fullAudioUrl = generateAudioUrl(word.audio_url);
      if (!fullAudioUrl) return;

      const track = {
        id: `word-${word.id}`,
        audioUrl: fullAudioUrl,
        title: word.english || word.word_form || 'Word Audio',
      };

      await simpleAudioService.play(track);
    } catch (error) {
      // Silently fail - audio playback is not critical
      console.warn('Word audio playback failed:', error);
    }
  }, [word.audio_url, wordAudioEnabled, word.id, word.english, word.word_form]);

  // Show tooltip on quick press with fade animation (manual trigger)
  const handlePress = useCallback(() => {
    // Play audio asynchronously (non-blocking) if available and enabled
    if (word.audio_url && wordAudioEnabled) {
      handleWordAudio().catch(error => {
        // Silently handle audio errors to avoid blocking UI
        console.warn('Word audio playback failed:', error);
      });
      // Provide immediate haptic feedback
      selectionFeedback();
    }

    // Open the tooltip immediately (don't wait for audio)
    // Ensure we have fresh absolute coordinates
    if (wordRef?.current) {
      wordRef.current.measureInWindow((x, y, width, height) => {
        if (x !== undefined && y !== undefined && width > 0 && height > 0) {
          const freshLayout = { x, y, width, height };
          setAbsoluteLayout(freshLayout);
          onTooltipOpen(freshLayout);
        } else if (absoluteLayout) {
          // Fallback to existing layout
          onTooltipOpen(absoluteLayout);
        }
      });
    } else if (absoluteLayout) {
      onTooltipOpen(absoluteLayout);
    }
  }, [absoluteLayout, onTooltipOpen, wordRef, word.audio_url, wordAudioEnabled, handleWordAudio]);

  // ===== COLOR BATCHING (PREVENTS MULTIPLE COLOR CALCULATIONS) =====
  const batchedColors = useMemo(
    (): ArabicWordColors => ({
      wordDueUnderline: colors.wordDueUnderline,
      wordSelectionUnderline: colors.tint, // Use tint color for study list words
    }),
    [colors.wordDueUnderline, colors.tint]
  );

  // Compute final styles for the word container
  // Always reserve underline space to avoid layout jump by using a transparent baseline underline
  const baseUnderlineStyle = useMemo(
    () => ({ borderBottomWidth: 1, borderBottomColor: colors.transparent }),
    [colors.transparent]
  );

  const containerStyle = useMemo(
    () => [
      styles.wordContainer,
      baseUnderlineStyle,
      getSelectedStyle(isSelected, isDueWord, batchedColors),
    ],
    [isSelected, isDueWord, batchedColors, baseUnderlineStyle]
  );

  // Render colored segments or single word
  const renderWordContent = useMemo(() => {
    if (!hasComponents || coloredSegments.length <= 1) {
      // Single color word - use default Arabic text color
      return (
        <ThemedText
          {...baseTextProps}
          colorName="arabicText"
          style={[baseTextProps.style, { color: colors.arabicText }]}
        >
          {word.word_form}
        </ThemedText>
      );
    }

    // Multi-colored segments - render each with its own color
    return (
      <ThemedText {...baseTextProps}>
        {coloredSegments.map(segment => (
          <ThemedText
            key={`${segment.type}-${segment.text}-${segment.color}`}
            {...baseTextProps}
            style={[baseTextProps.style, { color: segment.color }]}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  }, [hasComponents, coloredSegments, baseTextProps, colors.arabicText, word.word_form]);

  return (
    <TouchableOpacity
      ref={wordRef}
      activeOpacity={LAYOUT.OPACITY.HIGH}
      style={containerStyle}
      testID={testID}
      onLayout={handleLayout}
      onPress={handlePress}
    >
      <View style={styles.wordView}>{renderWordContent}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    textAlign: 'center',
    paddingBottom: LAYOUT.SPACING.MICRO,
    marginBottom: -LAYOUT.SPACING.MICRO,
  },
  wordContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MICRO,
  },
  wordView: {},
});

export const ArabicWord = memo(ArabicWordComponent, (prevProps, nextProps) => {
  // Check primitive values first for early return
  if (
    prevProps.word.id !== nextProps.word.id ||
    prevProps.settings.fontScale !== nextProps.settings.fontScale ||
    prevProps.position !== nextProps.position ||
    prevProps.isDueWord !== nextProps.isDueWord ||
    prevProps.testID !== nextProps.testID
  ) {
    return false;
  }

  // Check word properties that affect rendering
  if (
    prevProps.word.english !== nextProps.word.english ||
    prevProps.word.word_form !== nextProps.word.word_form ||
    prevProps.word.root_id !== nextProps.word.root_id
  ) {
    return false;
  }

  // Check stable references
  if (
    prevProps.onTooltipOpen !== nextProps.onTooltipOpen ||
    prevProps.wordRef !== nextProps.wordRef
  ) {
    return false;
  }

  return true;
});
