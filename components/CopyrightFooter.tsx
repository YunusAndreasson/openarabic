import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LAYOUT } from '../constants/layout';
import { ThemedText } from './ThemedText';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * A component that displays a copyright notice with the current Hijri year
 */
export const CopyrightFooter = React.memo(() => {
  // Get current Hijri year
  const getHijriYear = (): number => {
    // Simple calculation for Hijri year (approximate)
    const today = new Date();
    const gregorianYear = today.getFullYear();
    const gregorianMonth = today.getMonth();
    const gregorianDay = today.getDate();

    // Formula to approximate Hijri year
    // (Gregorian year - 622) * 33/32
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));

    return hijriYear;
  };

  const hijriYear = getHijriYear();

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(400).delay(300)}>
      <ThemedText style={styles.copyrightText}>
        © {new Date().getFullYear()} OpenArabic • {hijriYear} هـ
      </ThemedText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  copyrightText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED - 0.1,
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
