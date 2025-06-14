import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

import { ThemedText } from './ThemedText';
import TouchableIcon from './TouchableIcon';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  onInfoPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  isFirstSection?: boolean;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  onInfoPress,
  containerStyle,
  isFirstSection = false,
}) => {
  const colors = useColors();

  const titleStyle = React.useMemo(
    () => ({
      marginBottom: 0,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.lineHeightMultiplier,
    }),
    []
  );

  const subtitleStyle = React.useMemo(
    () => ({
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
      marginTop: LAYOUT.SPACING.TINY,
    }),
    []
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
          color={colors.tint}
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

const areEqual = (
  prevProps: SectionTitleProps,
  nextProps: SectionTitleProps
) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.onInfoPress === nextProps.onInfoPress &&
    prevProps.isFirstSection === nextProps.isFirstSection &&
    prevProps.containerStyle === nextProps.containerStyle
  );
};

export default React.memo(SectionTitle, areEqual);

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SECTION_INTERNAL,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  firstSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  infoIcon: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
