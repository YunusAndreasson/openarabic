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
 * Displays an icon, title, and hint message with consistent styling.
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
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE, // 24px - modern spacing between icon and title
  },
  title: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM, // 12px - balanced spacing between title and description
  },
  hintContainer: {
    maxWidth: 320, // Optimal reading width for mobile (2025 best practice)
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
    alignItems: 'center',
    minHeight: 80, // Fixed height to prevent title movement (accommodates longest text)
  },
  hint: {
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.LOOSE, // 1.6x for better readability
  },
});
