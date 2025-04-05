import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { handleError } from '@/utils/errorHandling';

import { LAYOUT } from '../../constants/layout';
import { ThemedText } from '../ThemedText';

/**
 * A component that displays a copyright notice with the current Hijri year
 */
export const CopyrightFooter = memo(() => {
  // Get current Hijri year using Intl.DateTimeFormat
  const getHijriYear = (): number => {
    try {
      const date = new Date();
      const hijriDate = new Intl.DateTimeFormat('en-u-ca-islamic', {
        year: 'numeric',
      }).format(date);
      return parseInt(hijriDate, 10);
    } catch (error) {
      handleError(error as Error);
      const gregorianYear = new Date().getFullYear();
      return Math.floor((gregorianYear - 622) * (33 / 32));
    }
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
