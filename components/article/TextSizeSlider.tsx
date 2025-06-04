import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

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

    // Animate visibility
    React.useEffect(() => {
      if (isVisible) {
        height.value = withSpring(SLIDER_HEIGHT, {
          damping: 20,
          stiffness: 200,
        });
        opacity.value = withTiming(1, { duration: ANIMATION_DURATION });
      } else {
        height.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        });
        opacity.value = withTiming(0, { duration: ANIMATION_DURATION });
      }
    }, [isVisible, height, opacity]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
      height: height.value,
      opacity: opacity.value,
    }));

    const animatedContentStyle = useAnimatedStyle(() => ({
      transform: [{ scale: opacity.value }],
    }));

    const overlayStyle = useMemo(
      () => ({
        backgroundColor: isDarkMode ? 'rgba(26, 33, 27, 0.35)' : 'rgba(253, 254, 253, 0.45)',
      }),
      [isDarkMode]
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
          <BlurView
            intensity={isDarkMode ? 40 : 30}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.blurContainer}
          />
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
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
