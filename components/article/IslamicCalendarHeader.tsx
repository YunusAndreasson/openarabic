import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment-hijri';
import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { HIJRI_MONTHS } from '@/constants/hijri';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

const GOLDEN_RATIO = 1.618;
const HEADER_HEIGHT = 400;
const ADJUSTED_HEADER_HEIGHT = HEADER_HEIGHT / GOLDEN_RATIO;

const styles = StyleSheet.create({
  // Wrapper that contains the header
  wrapper: {
    position: 'relative',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    height: ADJUSTED_HEADER_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Multi-layer gradient system for better text readability
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%', // Cover more of the image for better text readability
  },
  backgroundGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  hijriDate: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    textAlign: 'center',
    // Text shadow styling will be added dynamically using theme colors
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.HALF_TINY },
    textShadowRadius: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  englishDate: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    textAlign: 'center',
    // Text shadow styling will be added dynamically using theme colors
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.HALF_TINY,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  activeCount: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.MEDIUM,
    // Text shadow styling will be added dynamically using theme colors
    textShadowOffset: { width: 0, height: LAYOUT.SPACING.MICRO },
    textShadowRadius: LAYOUT.SPACING.HALF_TINY,
  },
});

interface IslamicCalendarHeaderProps {
  activeEventsCount?: number;
}

export const IslamicCalendarHeader = memo<IslamicCalendarHeaderProps>(
  ({ activeEventsCount = 0 }) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

    // Generate today's date information
    const dateInfo = useMemo(() => {
      const hijriMoment = moment();
      const hijriDay = hijriMoment.iDate();
      const hijriMonth = HIJRI_MONTHS[hijriMoment.iMonth()];
      const hijriYear = hijriMoment.iYear();

      const englishDate = hijriMoment.format('MMMM Do, YYYY');

      return {
        hijriDate: `${hijriDay} ${hijriMonth} ${hijriYear} ${STRINGS.AH}`,
        englishDate,
      };
    }, []);

    // Enhanced gradient for better text readability using theme colors
    const imageGradientColors = useMemo(
      () =>
        [
          'transparent',
          'transparent',
          'rgba(0, 0, 0, 0.15)',
          'rgba(0, 0, 0, 0.3)',
          'rgba(0, 0, 0, 0.5)',
          'rgba(0, 0, 0, 0.7)',
          'rgba(0, 0, 0, 0.85)',
        ] as const,
      []
    );

    // Background gradient colors for smooth transition using proper dark mode detection
    const backgroundGradientColors = useMemo(() => {
      const baseColor = isDarkMode ? '0, 0, 0' : '255, 255, 255';
      return [
        'transparent',
        'transparent',
        'transparent',
        `rgba(${baseColor}, 0.1)`,
        `rgba(${baseColor}, 0.25)`,
        `rgba(${baseColor}, 0.4)`,
        `rgba(${baseColor}, 0.6)`,
        `rgba(${baseColor}, 0.8)`,
        `rgba(${baseColor}, 0.95)`,
        colors.background,
      ] as const;
    }, [isDarkMode, colors.background]);

    return (
      <View style={styles.wrapper}>
        {/* Header Container */}
        <View style={styles.container}>
          {/* Background Image */}
          <View style={styles.imageContainer}>
            <Image source={require('@/assets/images/moon.jpg')} style={styles.backgroundImage} />

            {/* Image gradient overlay for text readability */}
            <LinearGradient
              colors={imageGradientColors}
              locations={[0, 0.1, 0.3, 0.5, 0.65, 0.8, 1]}
              style={styles.imageGradientOverlay}
              pointerEvents="none"
            />

            {/* Background gradient overlay for smooth transition */}
            <LinearGradient
              colors={backgroundGradientColors}
              locations={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1]}
              style={styles.backgroundGradientOverlay}
              pointerEvents="none"
            />
          </View>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Hijri Date - Primary */}
            <ThemedText
              type="arabic"
              skipDefaultColor
              style={[
                styles.hijriDate,
                { color: colors.white, textShadowColor: colors.textShadowDark },
              ]}
            >
              {dateInfo.hijriDate}
            </ThemedText>

            {/* English Date - Secondary */}
            <ThemedText
              skipDefaultColor
              style={[
                styles.englishDate,
                { color: colors.white, textShadowColor: colors.textShadowDark },
              ]}
            >
              {dateInfo.englishDate}
            </ThemedText>

            {/* Active Events Count - Tertiary */}
            {activeEventsCount > 0 && (
              <ThemedText
                skipDefaultColor
                style={[
                  styles.activeCount,
                  { color: colors.white, textShadowColor: colors.textShadowDark },
                ]}
              >
                {activeEventsCount === 1
                  ? `${activeEventsCount} active event today`
                  : `${activeEventsCount} active events today`}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    );
  }
);

IslamicCalendarHeader.displayName = 'IslamicCalendarHeader';
