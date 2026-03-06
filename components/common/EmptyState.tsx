import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  iconSize?: number;
}

/**
 * Generic empty state component used across the app.
 * Displays an icon, title, and hint message.
 */
export function EmptyState({
  icon,
  title,
  hint,
  iconSize = LAYOUT.BUTTON.ICON_SIZE.HERO,
}: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={iconSize} color={colors.textTertiary} />
      </View>

      <ThemedText type="heading3" style={styles.title}>
        {title}
      </ThemedText>

      <View style={styles.hintContainer}>
        <ThemedText style={styles.hint} type="caption" variant="secondary">
          {hint}
        </ThemedText>
      </View>

    </View>
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
    maxWidth: 320,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
    alignItems: 'center',
  },
  hint: {
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.LOOSE, // 1.6x for better readability
  },
});
