import { memo, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons, Toggle } from '@/components/ui';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

type IconName = ComponentProps<typeof Ionicons>['name'];

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

  // Render right side based on type
  const renderRight = () => {
    switch (props.rightType) {
      case 'toggle':
        return (
          <Toggle
            accessibilityLabel={label}
            value={props.toggleValue}
            onValueChange={props.onToggleChange}
          />
        );

      case 'text-chevron':
        return (
          <View style={styles.rightValue}>
            <ThemedText type="body" colorName="secondaryMetadataText">
              {props.rightText}
            </ThemedText>
            <Ionicons
              color={colors.secondaryMetadataText}
              name="chevron-forward"
              size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            />
          </View>
        );

      case 'custom':
        return props.rightComponent;

      case 'external':
        return (
          <Ionicons
            color={colors.secondaryMetadataText}
            name="open-outline"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            style={styles.chevron}
          />
        );

      case 'none':
        return null;

      case 'chevron':
      default:
        return (
          <Ionicons
            color={colors.secondaryMetadataText}
            name="chevron-forward"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            style={styles.chevron}
          />
        );
    }
  };

  return (
    <BaseCard elevation="hairline" style={cardStyle} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.iconContainer}>
            <Ionicons color={iconColor} name={icon} size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM} />
          </View>
          <View style={subtitle ? styles.textContainerWithSubtitle : styles.textContainer}>
            <ThemedText type="body" colorName={textColor === 'error' ? 'error' : 'text'}>
              {label}
            </ThemedText>
            {subtitle && (
              <ThemedText colorName="textTertiary" style={styles.subtitle} type="caption">
                {subtitle}
              </ThemedText>
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
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  textContainerWithSubtitle: {
    flexDirection: 'column',
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
  },
  chevron: {
    minWidth: LAYOUT.SPACING.XLARGE,
    textAlign: 'center',
  },
});
