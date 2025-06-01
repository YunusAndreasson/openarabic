import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';

import { ThemedText } from './ThemedText';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  onInfoPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  isFirstSection?: boolean;
}

/**
 * A minimal, refined section title component
 * Clean typography with perfectly balanced spacing
 * Supports optional subtitle and info button for enhanced sections
 */
const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  onInfoPress,
  containerStyle,
  isFirstSection = false,
}) => {
  const colors = useColors();

  return (
    <View style={[styles.container, isFirstSection && styles.firstSection, containerStyle]}>
      <View style={styles.titleGroup}>
        <ThemedText type="heading2" weight="bold" style={styles.titleText}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="caption" variant="secondary" style={styles.subtitleText}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {onInfoPress && (
        <TouchableOpacity
          onPress={onInfoPress}
          style={[styles.infoIcon, { backgroundColor: colors.textOverlay }]}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
        >
          <Ionicons
            name="information-outline"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

export default SectionTitle;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SECTION.SPACING_INTERNAL,
    marginTop: LAYOUT.SECTION.SPACING_BETWEEN,
  },
  firstSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  titleGroup: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  titleText: {
    marginBottom: 0,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  subtitleText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    marginTop: LAYOUT.SPACING.TINY,
  },
  infoIcon: {
    padding: LAYOUT.SPACING.SMALL,
    width: LAYOUT.BUTTON.ICON_SIZE.SMALL + LAYOUT.SPACING.SMALL * 2,
    height: LAYOUT.BUTTON.ICON_SIZE.SMALL + LAYOUT.SPACING.SMALL * 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
});
