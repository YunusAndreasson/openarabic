import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import type { LayoutChangeEvent, LayoutRectangle, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { DEFAULT_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWord } from '@/hooks/vocabulary/useArabicWord';
import type { TextWeight } from '@/types/ui/text.types';
import type { SentenceWord } from '@/types/vocabulary.types';

interface ArabicWordProps {
  word: SentenceWord;
  onPress: (word: SentenceWord) => void;
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
  onPress,
  onTooltipOpen,
  position,
  settings,
  wordRef,
  isDueWord = false,
  testID,
}: ArabicWordProps) {
  const colors = useColors();
  const [absoluteLayout, setAbsoluteLayout] = useState<LayoutRectangle | null>(null);

  // Use our new hook for word selection state
  const { isSelected } = useArabicWord({
    word,
    position,
    onPress,
  });

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
  const calculatedFontSize = useMemo(() => settings.fontScale * 24, [settings.fontScale]);

  // More aggressively memoized text props (depends on selection and tooltip visibility)
  const textProps = useMemo(
    () => ({
      type: 'arabic' as const,
      variant: isSelected ? ('primary' as const) : undefined,
      skipDefaultColor: false,
      colorName: 'arabicText' as const,
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

  // Removed long press functionality - words are now added to study list via tooltip bookmark icon

  const getSelectedStyle = useCallback(
    (): ViewStyle => ({
      borderBottomWidth: 1,
      borderBottomColor: isDueWord ? colors.wordDueUnderline : colors.wordSelectionUnderline,
    }),
    [colors.wordDueUnderline, colors.wordSelectionUnderline, isDueWord]
  );

  // Compute final styles for the word container
  const containerStyle = useMemo(
    () => [styles.wordContainer, isSelected && getSelectedStyle()],
    [isSelected, getSelectedStyle]
  );

  return (
    <TouchableOpacity
      ref={wordRef}
      activeOpacity={0.7}
      style={containerStyle}
      testID={testID}
      onLayout={handleLayout}
      onPress={handlePress}
    >
      <View style={styles.wordView}>
        <ThemedText {...textProps}>{word.word_form}</ThemedText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    textAlign: 'center',
    paddingBottom: LAYOUT.SPACING.MICRO * 2,
    marginBottom: -LAYOUT.BORDER.WIDTH.NORMAL,
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
    prevProps.position === nextProps.position
  );
});
