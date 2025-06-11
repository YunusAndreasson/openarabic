import Slider from '@react-native-community/slider';
import type { JSX } from 'react';
import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
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
  const sliderStyle = useMemo(
    () =>
      Platform.OS === 'android'
        ? [styles.slider, { transform: [{ scaleX: 1.0 }, { scaleY: 1.2 }] }]
        : styles.slider,
    []
  );

  return (
    <View style={[styles.container, style]}>
      <Slider
        maximumTrackTintColor={colors.tabIconDefault}
        maximumValue={maximumValue}
        minimumTrackTintColor={colors.tint}
        minimumValue={minimumValue}
        step={step}
        style={sliderStyle}
        tapToSeek={true}
        thumbTintColor={colors.tint}
        value={value}
        onValueChange={onValueChange}
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
