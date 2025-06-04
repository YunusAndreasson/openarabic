import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

import { CustomSlider } from '@/components/Slider';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';
import type { ThemeColors } from '@/types/ui/theme.types';

interface TextSizeSliderProps {
  isVisible: boolean;
  fontScale: number;
  onFontScaleChange: (value: number) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
}

const SLIDER_HEIGHT = 80;
const ANIMATION_DURATION = 300;

export const TextSizeSlider = memo<TextSizeSliderProps>(
  ({ isVisible, fontScale, onFontScaleChange, colors, isDarkMode }) => {
    const height = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.95);

    // Animate visibility with more prominent entrance
    React.useEffect(() => {
      if (isVisible) {
        height.value = withSpring(SLIDER_HEIGHT, {
          damping: 18,
          stiffness: 220,
        });
        opacity.value = withTiming(1, { duration: 250 });
        scale.value = withSpring(1, {
          damping: 15,
          stiffness: 200,
        });
      } else {
        height.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
        opacity.value = withTiming(0, { duration: 200 });
        scale.value = withSpring(0.95, {
          damping: 20,
          stiffness: 200,
        });
      }
    }, [isVisible, height, opacity, scale]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
      height: height.value,
      opacity: opacity.value,
    }));

    const animatedContentStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const overlayStyle = useMemo(
      () => ({
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }),
      [colors]
    );

    const handleFontScaleChange = (value: number) => {
      lightFeedback();
      onFontScaleChange(value);
    };

    if (!isVisible && height.value === 0) {
      return null;
    }

    return (
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <View style={styles.sliderWrapper}>
          <View style={[styles.overlay, overlayStyle]} />

          <Animated.View style={[styles.content, animatedContentStyle]}>
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <ThemedText type="label" weight="medium" style={styles.label}>
                  Text Size
                </ThemedText>
                <ThemedText type="label" variant="secondary" style={styles.value}>
                  {Math.round(fontScale * 100)}%
                </ThemedText>
              </View>

              <View style={styles.sliderContainer}>
                <CustomSlider
                  value={fontScale}
                  onValueChange={handleFontScaleChange}
                  minimumValue={0.8}
                  maximumValue={1.3}
                  step={0.1}
                  style={styles.slider}
                />
              </View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }
);

TextSizeSlider.displayName = 'TextSizeSlider';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.TINY,
  },
  sliderWrapper: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
  },
  sliderSection: {
    flex: 1,
    justifyContent: 'center',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  label: {
    flex: 1,
  },
  value: {
    minWidth: 50,
    textAlign: 'right',
  },
  sliderContainer: {
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    justifyContent: 'center',
  },
  slider: {
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
  },
});
