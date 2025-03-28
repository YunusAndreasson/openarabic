import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  LayoutRectangle,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import Animated from 'react-native-reanimated';
import { useAuth } from '../hooks/useAuth';
import { useOpacityAnimation, useTransformAnimation } from '../hooks/animations';
import { WordTooltip } from './WordTooltip';
import { lightFeedback } from '@/utils/haptics';
import { ArabicWordProps } from '@/types/ui/text.types';

// Type for animated styles to fix TypeScript errors
type AnimatedStyles = {
  [key: string]: any;
};

function ArabicWordComponent({
  word,
  isSelected,
  onPress,
  scale = 1,
  baseSize = 32,
}: ArabicWordProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  useAuth();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [pageLayout, setPageLayout] = useState<{ x: number; y: number } | null>(null);

  // Use transform animation for press feedback
  const {
    animatedStyle: pressStyle,
    startAnimation: startPressAnimation,
    reverseAnimation: reversePressAnimation,
  } = useTransformAnimation({
    type: 'scale',
    initialValue: 1,
    targetValue: 0.95,
    duration: 200,
  });

  // Use opacity animation for border
  const { setOpacity: setBorderOpacity, animatedStyle: borderStyle } = useOpacityAnimation({
    initialOpacity: isSelected ? 1 : 0,
    duration: 200,
  });

  // Use opacity animation for word fade
  const { animatedStyle: fadeStyle, setOpacity: setWordOpacity } = useOpacityAnimation({
    initialOpacity: 1,
    duration: 200,
  });

  // Calculate absolute position considering page scroll - memoized for performance
  const absoluteLayout = useMemo(
    () =>
      layout && pageLayout
        ? {
            ...layout,
            x: layout.x + pageLayout.x,
            y: layout.y + pageLayout.y,
          }
        : null,
    [layout, pageLayout]
  );

  // Update border opacity when selection changes
  useEffect(() => {
    setBorderOpacity(isSelected ? 1 : 0);
  }, [isSelected, setBorderOpacity]);

  // Capture layout on mount and when window resizes
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);

    if (Platform.OS === 'web') {
      setPageLayout({ x: window.pageXOffset, y: window.pageYOffset });
    } else {
      setPageLayout({ x: 0, y: 0 });
    }
  }, []);

  // Show tooltip on quick press with fade animation
  const handlePress = useCallback(() => {
    if (!layout) return;
    startPressAnimation();
    setWordOpacity(0.5, () => {
      setTooltipVisible(true);
      reversePressAnimation();
    });
  }, [layout, setWordOpacity, startPressAnimation, reversePressAnimation]);

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setWordOpacity(1, () => {
      setTooltipVisible(false);
    });
  }, [setWordOpacity]);

  // Add to study list on long press with animated feedback
  const handleLongPress = useCallback(() => {
    lightFeedback();
    onPress(word);
    startPressAnimation();

    setTimeout(() => {
      reversePressAnimation();
      setWordOpacity(1, () => {
        setTooltipVisible(false);
      });
    }, 300);
  }, [onPress, word, startPressAnimation, reversePressAnimation, setWordOpacity]);

  // Calculate font size once outside the memo to avoid recalculations
  const calculatedFontSize = baseSize * scale;

  // Memoize text props to prevent unnecessary recalculations
  const textProps = useMemo(
    () => ({
      type: 'arabic' as const,
      variant: isSelected ? ('primary' as const) : undefined,
      skipDefaultColor: true,
      colorName: tooltipVisible
        ? ('textTertiary' as const)
        : isSelected
          ? ('tint' as const)
          : ('text' as const),
      arabicFontSize: calculatedFontSize,
      weight: isSelected ? ('600' as const) : ('normal' as const),
      style: styles.textStyle,
    }),
    [isSelected, calculatedFontSize, tooltipVisible]
  );

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={250}
        style={styles.wordContainer}
        activeOpacity={0.7}
        onLayout={handleLayout}
      >
        <Animated.View
          style={[
            styles.container,
            pressStyle as AnimatedStyles,
            borderStyle as AnimatedStyles,
            fadeStyle as AnimatedStyles,
            {
              borderBottomColor: isSelected ? colors.textOverlay : 'transparent',
            },
          ]}
        >
          <ThemedText {...textProps}>{word.word_form}</ThemedText>
        </Animated.View>
      </TouchableOpacity>

      {layout && (
        <WordTooltip
          visible={tooltipVisible}
          text={word.english}
          layout={absoluteLayout}
          onClose={handleTooltipClose}
        />
      )}
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ArabicWord = memo(ArabicWordComponent);

const styles = StyleSheet.create({
  wordContainer: {
    marginHorizontal: 1,
    marginVertical: LAYOUT.SPACING.TINY / 2,
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    flexShrink: 0,
    flexGrow: 0,
    alignSelf: 'flex-start',
    maxWidth: 150,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: LAYOUT.BORDER.WIDTH.NORMAL + LAYOUT.BORDER.WIDTH.THIN,
    borderBottomColor: 'transparent',
  },
  textStyle: {
    paddingVertical: 0,
    marginBottom: 0,
  },
});
