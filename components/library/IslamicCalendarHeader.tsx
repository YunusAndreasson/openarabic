import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import moment from 'moment-hijri';
import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { HIJRI_MONTHS } from '@/constants/hijri';
import { GOLDEN_RATIO, LAYOUT, SCREEN_WIDTH, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import {
  createStrongDarkOverlayGradient,
  createThemeBackgroundGradient,
} from '@/utils/gradientUtils';

const HEADER_HEIGHT = LAYOUT.HEADER.HEIGHT.EXPANDED; // use standardized header height
const ADJUSTED_HEADER_HEIGHT = HEADER_HEIGHT / GOLDEN_RATIO;

const styles = StyleSheet.create({
  // Wrapper that contains the header
  wrapper: {
    position: 'relative',
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
    height: '85%', // Canvas container height (Rect inside controls actual gradient)
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
    // Strong text shadow for excellent readability
    textShadowOffset: { width: 0, height: LAYOUT.BORDER.WIDTH.NORMAL },
    textShadowRadius: LAYOUT.SPACING.MEDIUM, // ~12
    marginBottom: LAYOUT.SPACING.TINY,
  },
  englishDate: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    textAlign: 'center',
    // Strong text shadow for excellent readability
    textShadowOffset: { width: 0, height: LAYOUT.BORDER.WIDTH.NORMAL },
    textShadowRadius: LAYOUT.SPACING.LARGE, // ~16 (slightly stronger for legibility)
    marginBottom: LAYOUT.SPACING.TINY,
  },
  activeCount: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.MEDIUM,
    // Strong text shadow for excellent readability
    textShadowOffset: { width: 0, height: LAYOUT.BORDER.WIDTH.NORMAL },
    textShadowRadius: LAYOUT.SPACING.SMALL, // ~8
  },
});

interface IslamicCalendarHeaderProps {
  activeEventsCount?: number;
}

export const IslamicCalendarHeader = memo<IslamicCalendarHeaderProps>(
  ({ activeEventsCount = 0 }) => {
    const colors = useColors();

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
    const imageGradientColors = useMemo(() => {
      return createStrongDarkOverlayGradient(colors.black);
    }, [colors.black]);

    // Background gradient colors for smooth transition using proper theme detection
    const backgroundGradientColors = useMemo(() => {
      return createThemeBackgroundGradient(colors.background);
    }, [colors.background]);

    return (
      <View style={styles.wrapper}>
        {/* Header Container */}
        <View style={styles.container}>
          {/* Background Image */}
          <View style={styles.imageContainer}>
            <Image source={require('@/assets/images/moon.jpg')} style={styles.backgroundImage} />

            {/* Image gradient overlay for text readability - Skia for Android stability */}
            <Canvas style={styles.imageGradientOverlay} pointerEvents="none">
              <Rect x={0} y={0} width={SCREEN_WIDTH} height={ADJUSTED_HEADER_HEIGHT * 0.85}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, ADJUSTED_HEADER_HEIGHT * 0.85)}
                  colors={[...imageGradientColors]}
                  positions={[0, 0.2, 0.4, 0.55, 0.7, 0.85, 1]}
                />
              </Rect>
            </Canvas>

            {/* Background gradient overlay for smooth transition - Skia for Android stability */}
            <Canvas style={styles.backgroundGradientOverlay} pointerEvents="none">
              <Rect x={0} y={0} width={SCREEN_WIDTH} height={ADJUSTED_HEADER_HEIGHT}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, ADJUSTED_HEADER_HEIGHT)}
                  colors={[...backgroundGradientColors]}
                  positions={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1]}
                />
              </Rect>
            </Canvas>
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
  },
);

IslamicCalendarHeader.displayName = 'IslamicCalendarHeader';
