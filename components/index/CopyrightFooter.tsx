import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LAYOUT } from '../../constants/layout';
import { ThemedText } from '../ThemedText';

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
  const copyrightText = `© ${new Date().getFullYear()} OpenArabic • ${hijriYear}هـ`;

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <ThemedText type="caption" variant="subtle" align="center">
          {copyrightText}
        </ThemedText>
      </View>
    </View>
  );
});

CopyrightFooter.displayName = 'CopyrightFooter';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
});
