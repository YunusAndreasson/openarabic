import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { LAYOUT, TYPOGRAPHY_HIERARCHY, getEnhancedOpacity } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';

import { ThemedText } from './ThemedText';
import TouchableIcon from './TouchableIcon';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  onInfoPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  isFirstSection?: boolean;
}

/**
 * A minimal, refined section title component with sophisticated typography colors
 * Clean typography with perfectly balanced spacing and enhanced micro-typography
 * Now uses dedicated heading and subtitle colors for maximum polish and hierarchy
 * Supports optional subtitle and info button for enhanced sections
 */
const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  onInfoPress,
  containerStyle,
  isFirstSection = false,
}) => {
  const isDarkMode = useIsDarkMode();

  // Enhanced styles with sophisticated typography colors and micro-typography
  const titleStyle = React.useMemo(
    () => ({
      marginBottom: 0,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.letterSpacing,
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.lineHeightMultiplier,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const subtitleStyle = React.useMemo(
    () => ({
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
      marginTop: LAYOUT.SPACING.TINY,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.TERTIARY, isDarkMode),
      letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
    }),
    [isDarkMode]
  );

  return (
    <View style={[styles.container, isFirstSection && styles.firstSection, containerStyle]}>
      <View style={styles.titleGroup}>
        <ThemedText colorName="headingText" style={titleStyle} type="heading2">
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText colorName="subtitleText" style={subtitleStyle} type="caption">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {onInfoPress && (
        <TouchableIcon
          accessibilityLabel="More information"
          name="information-outline"
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          style={styles.infoIcon}
          touchSize="small"
          onPress={onInfoPress}
        />
      )}
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default SectionTitle;

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SECTION.SPACING_INTERNAL,
    marginTop: LAYOUT.SECTION.SPACING_BETWEEN,
  },
  firstSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  infoIcon: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    height: LAYOUT.BUTTON.ICON_SIZE.SMALL + LAYOUT.SPACING.SMALL * 2,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
    width: LAYOUT.BUTTON.ICON_SIZE.SMALL + LAYOUT.SPACING.SMALL * 2,
  },
  titleGroup: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
});
