import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LAYOUT } from '../constants/layout';
import { ThemedText } from './ThemedText';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation } from '@/hooks/animations';

/**
 * A component that displays a copyright notice with the current Hijri year
 */
export const CopyrightFooter = React.memo(() => {
  // Get current Hijri year
  const getHijriYear = (): number => {
    // Simple calculation for Hijri year (approximate)
    const today = new Date();
    const gregorianYear = today.getFullYear();

    // Formula to approximate Hijri year
    // (Gregorian year - 622) * 33/32
    const hijriYear = Math.floor((gregorianYear - 622) * (33 / 32));

    return hijriYear;
  };

  const hijriYear = getHijriYear();
  const { animatedStyle, startAnimation } = useOpacityAnimation({ initialOpacity: 0, delay: 300, duration: 400 });

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  const copyrightText = `© ${new Date().getFullYear()} OpenArabic • ${hijriYear}هـ`;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.textContainer}>
        <ThemedText type="caption" variant="subtle" align="center">
          {copyrightText}
        </ThemedText>
      </View>
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
  textContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
