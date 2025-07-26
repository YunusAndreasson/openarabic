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
import type { TextWeight } from '@/types/ui/text.types';
import type { SentenceWord } from '@/types/vocabulary.types';
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

  // Show tooltip on quick press with fade animation (manual trigger)
  const handlePress = useCallback(() => {
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
  }, [absoluteLayout, onTooltipOpen, wordRef]);

  // ===== COLOR BATCHING (PREVENTS MULTIPLE COLOR CALCULATIONS) =====
  const batchedColors = useMemo(
    (): ArabicWordColors => ({
      wordDueUnderline: colors.wordDueUnderline,
      wordSelectionUnderline: colors.wordSelectionUnderline,
    }),
    [colors.wordDueUnderline, colors.wordSelectionUnderline]
  );

  // Compute final styles for the word container
  const containerStyle = useMemo(
    () => [styles.wordContainer, getSelectedStyle(isSelected, isDueWord, batchedColors)],
    [isSelected, isDueWord, batchedColors]
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
  return (
    prevProps.word.id === nextProps.word.id &&
    prevProps.settings.fontScale === nextProps.settings.fontScale &&
    prevProps.position === nextProps.position &&
    prevProps.word.english === nextProps.word.english // Add this to detect translation changes
  );
});
