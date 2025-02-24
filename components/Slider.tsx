import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Slider from '@react-native-community/slider';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';

interface CustomSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  style?: ViewStyle;
}

export function CustomSlider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.1,
  style,
}: CustomSliderProps) {
  const colors = useColors();

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
        style={styles.slider}
        tapToSeek={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
