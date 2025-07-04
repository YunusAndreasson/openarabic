import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import moment from 'moment-hijri';
import React, { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { HIJRI_MONTHS } from '@/constants/hijri';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

const GOLDEN_RATIO = 1.618;
const HEADER_HEIGHT = 400;
const ADJUSTED_HEADER_HEIGHT = HEADER_HEIGHT / GOLDEN_RATIO;

const styles = StyleSheet.create({
  // Wrapper that contains both the header and the close button
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
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  englishDate: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  activeCount: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.MEDIUM,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Close button positioned outside the rounded container
  closeButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
    ...LAYOUT.ELEVATION.SUBTLE,
  },
});

interface IslamicCalendarHeaderProps {
  activeEventsCount?: number;
}

export const IslamicCalendarHeader = memo<IslamicCalendarHeaderProps>(
  ({ activeEventsCount = 0 }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

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

    // Background gradient colors for smooth transition using theme colors
    const backgroundGradientColors = useMemo(
      () =>
        [
          'transparent',
          'transparent',
          'transparent',
          `rgba(${colors.background === '#000000' ? '0, 0, 0' : '255, 255, 255'}, 0.1)`,
          `rgba(${colors.background === '#000000' ? '0, 0, 0' : '255, 255, 255'}, 0.25)`,
          `rgba(${colors.background === '#000000' ? '0, 0, 0' : '255, 255, 255'}, 0.4)`,
          `rgba(${colors.background === '#000000' ? '0, 0, 0' : '255, 255, 255'}, 0.6)`,
          `rgba(${colors.background === '#000000' ? '0, 0, 0' : '255, 255, 255'}, 0.8)`,
          `rgba(${colors.background === '#000000' ? '0, 0, 0' : '255, 255, 255'}, 0.95)`,
          colors.background,
        ] as const,
      [colors.background]
    );

    // Close button handler
    const handleClose = useMemo(
      () => () => {
        selectionFeedback();
        router.back();
      },
      []
    );

    // Memoize close button style with safe area insets - positioned at actual screen top
    const closeButtonStyle = useMemo(
      () => ({
        ...styles.closeButton,
        top: insets.top + LAYOUT.SPACING.TINY, // At the very top of safe area
        left: LAYOUT.SPACING.TINY, // Close to left edge
        backgroundColor: colors.elevation1,
      }),
      [insets.top, colors.elevation1]
    );

    return (
      <View style={styles.wrapper}>
        {/* Close Button - Positioned at actual screen top */}
        <Pressable
          style={closeButtonStyle}
          onPress={handleClose}
          android_ripple={{
            color: colors.tint,
            radius: MIN_TOUCH_TARGET.MEDIUM / 2,
          }}
          accessibilityRole="button"
          accessibilityLabel="Close calendar"
        >
          <Ionicons
            name="close"
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={colors.secondaryText}
          />
        </Pressable>

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
              style={[styles.hijriDate, { color: colors.white }]}
            >
              {dateInfo.hijriDate}
            </ThemedText>

            {/* English Date - Secondary */}
            <ThemedText skipDefaultColor style={[styles.englishDate, { color: colors.white }]}>
              {dateInfo.englishDate}
            </ThemedText>

            {/* Active Events Count - Tertiary */}
            {activeEventsCount > 0 && (
              <ThemedText skipDefaultColor style={[styles.activeCount, { color: colors.white }]}>
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
