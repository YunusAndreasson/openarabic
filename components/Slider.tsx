import Slider from '@react-native-community/slider';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { CustomSliderProps } from '@/types/ui/form.types';

export function CustomSlider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.1,
  style,
}: CustomSliderProps): JSX.Element {
  const colors = useColors();

  // Use a conditional to apply platform-specific styles
  const sliderStyle =
    Platform.OS === 'android'
      ? [styles.slider, { transform: [{ scaleX: 1.0 }, { scaleY: 1.2 }] }]
      : styles.slider;

  return (
    <View style={[styles.container, style]}>
      <Slider
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={colors.tint}
        maximumTrackTintColor={colors.tabIconDefault}
        thumbTintColor={colors.tint}
        style={sliderStyle}
        tapToSeek={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    justifyContent: 'center',
    width: '100%',
  },
  slider: {
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    width: '100%',
  },
});
