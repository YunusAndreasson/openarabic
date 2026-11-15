import { Icon, type IconName } from '@/components/ui/Icon';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  hint: string;
  iconSize?: number;
  /** Optional primary CTA shown below the hint */
  action?: EmptyStateAction;
  /** Optional secondary CTA rendered outlined below the primary */
  secondaryAction?: EmptyStateAction;
}

/**
 * Generic empty state component used across the app.
 * Displays an icon, title, hint message, and optional primary/secondary actions.
 */
export function EmptyState({
  icon,
  title,
  hint,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.HERO,
  action,
  secondaryAction,
}: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={iconSize} color={colors.textTertiary} />
      </View>

      <ThemedText type="heading3" style={styles.title}>
        {title}
      </ThemedText>

      <View style={styles.hintContainer}>
        <ThemedText style={styles.hint} type="caption" colorName="secondaryText">
          {hint}
        </ThemedText>
      </View>

      {(action || secondaryAction) && (
        <View style={styles.actions}>
          {action && <EmptyStateButton action={action} variant="filled" />}
          {secondaryAction && <EmptyStateButton action={secondaryAction} variant="outlined" />}
        </View>
      )}
    </View>
  );
}

function EmptyStateButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: 'filled' | 'outlined';
}) {
  return (
    <ThemedButton
      title={action.label}
      icon={action.icon}
      onPress={action.onPress}
      variant={variant}
      size="medium"
      loading={action.loading}
      disabled={action.disabled}
      allowTitleWrap
      fullWidth
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: '15%', // Optical center — compensates for tab bar and status bar
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM, // 12px - tight proximity groups icon with title
  },
  title: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE, // 16px - separates title group from hint
  },
  hintContainer: {
    maxWidth: LAYOUT.EMPTY_STATE.HINT_MAX_WIDTH,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.LOOSE, // 1.6x for better readability
  },
  actions: {
    marginTop: LAYOUT.SPACING.XLARGE,
    gap: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    maxWidth: LAYOUT.EMPTY_STATE.HINT_MAX_WIDTH,
  },
});
