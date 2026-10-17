import { memo, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon, type IconName, Toggle } from '@/components/ui';
import { INLINE_VALUE_MIN_WIDTH, LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

interface BaseSettingsCardProps {
  icon: IconName;
  label: string;
  subtitle?: string;
  iconColor?: string;
  textColor?: 'default' | 'error';
  backgroundColor?: string;
  onPress?: () => void;
}

interface ChevronCardProps extends BaseSettingsCardProps {
  rightType: 'chevron';
}

interface ExternalLinkCardProps extends BaseSettingsCardProps {
  rightType: 'external';
}

interface TextChevronCardProps extends BaseSettingsCardProps {
  rightType: 'text-chevron';
  rightText: string;
}

interface ToggleCardProps extends BaseSettingsCardProps {
  rightType: 'toggle';
  toggleValue: boolean;
  onToggleChange: (value: boolean) => void;
}

interface CustomCardProps extends BaseSettingsCardProps {
  rightType: 'custom';
  rightComponent: ReactNode;
}

interface NoneCardProps extends BaseSettingsCardProps {
  rightType?: 'none';
}

type SettingsCardProps =
  | ChevronCardProps
  | ExternalLinkCardProps
  | TextChevronCardProps
  | ToggleCardProps
  | CustomCardProps
  | NoneCardProps;

/**
 * Reusable settings card component that handles all common patterns
 * in the Account screen (icon + label + optional subtitle + right side content)
 */
export const SettingsCard = memo((props: SettingsCardProps) => {
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const stackValue =
    (props.rightType === 'text-chevron' || props.rightType === 'custom') &&
    width / fontScale < INLINE_VALUE_MIN_WIDTH;
  const {
    icon,
    label,
    subtitle,
    iconColor = colors.tint,
    textColor = 'default',
    backgroundColor,
    onPress,
  } = props;

  const cardStyle = backgroundColor ? [styles.card, { backgroundColor }] : styles.card;
  // A fixed-width slot centres the glyph, so a chevron and the wider
  // open-in-new symbol line up down the list.
  const navigationIndicator = (
    <View style={styles.chevron}>
      <Icon
        color={colors.secondaryMetadataText}
        name={props.rightType === 'external' ? 'open-outline' : 'chevron-forward'}
        size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
      />
    </View>
  );

  // Render right side based on type
  const renderRight = () => {
    switch (props.rightType) {
      case 'toggle':
        return <Toggle value={props.toggleValue} />;

      case 'text-chevron':
        if (stackValue) return navigationIndicator;
        return (
          <View style={styles.rightValue}>
            <ThemedText type="body" colorName="secondaryMetadataText">
              {props.rightText}
            </ThemedText>
            {navigationIndicator}
          </View>
        );

      case 'custom':
        return stackValue ? null : props.rightComponent;

      case 'none':
        return null;

      case 'chevron':
      case 'external':
      default:
        return navigationIndicator;
    }
  };

  // A toggle row is one control: a tap anywhere on it flips the switch, and it
  // is announced as a switch with its state. The switch at its end only draws
  // that state (see Toggle), so nothing handles the tap twice.
  const isToggleRow = props.rightType === 'toggle';
  const handleToggleRowPress = () => {
    if (props.rightType !== 'toggle') return;
    selectionFeedback();
    props.onToggleChange(!props.toggleValue);
  };

  return (
    <BaseCard
      elevation="none"
      style={cardStyle}
      onPress={isToggleRow ? handleToggleRowPress : onPress}
      accessibilityRole={isToggleRow ? 'switch' : undefined}
      accessibilityState={props.rightType === 'toggle' ? { checked: props.toggleValue } : undefined}
      accessibilityLabel={isToggleRow ? label : undefined}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.iconContainer}>
            <Icon color={iconColor} name={icon} size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM} />
          </View>
          <View style={styles.textContainer}>
            <ThemedText type="body" colorName={textColor === 'error' ? 'error' : 'text'}>
              {label}
            </ThemedText>
            {subtitle && (
              <ThemedText colorName="textTertiary" style={styles.subtitle} type="caption">
                {subtitle}
              </ThemedText>
            )}
            {stackValue && props.rightType === 'text-chevron' && (
              <ThemedText colorName="secondaryMetadataText" style={styles.subtitle} type="body">
                {props.rightText}
              </ThemedText>
            )}
            {stackValue && props.rightType === 'custom' && (
              <View style={styles.subtitle}>{props.rightComponent}</View>
            )}
          </View>
        </View>
        {renderRight()}
      </View>
    </BaseCard>
  );
});

SettingsCard.displayName = 'SettingsCard';

const styles = StyleSheet.create({
  card: {
    // SettingsSection owns the group's rounded surface and elevation.
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
  left: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  textContainer: {
    marginLeft: LAYOUT.SPACING.MEDIUM,
    flex: 1,
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.TINY,
  },
  rightValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
    flexShrink: 1,
  },
  chevron: {
    alignItems: 'center',
    minWidth: LAYOUT.SPACING.XLARGE,
  },
});
