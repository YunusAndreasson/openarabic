import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, type ComponentProps, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// Define EmptyStateProps inline
interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  icon?: string; // Simplified: only string icon names
  onAction?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  submessage?: string;
  customActionButton?: ReactNode;
  iconSize?: number;
  hideArticlesButton?: boolean;
}

const DEFAULT_ICON_SIZE = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE;

function handleBrowseArticles() {
  router.push(ROUTE_PATHS.LIBRARY_TAB);
}

/**
 * EmptyState component following Gestalt principles and visual hierarchy
 * - Proximity: Related elements are grouped together
 * - Similarity: Consistent styling for related elements
 * - Figure-Ground: Clear distinction between content and background
 * - Continuation: Natural flow from icon to title to description
 */
const EmptyState = memo(
  ({
    title,
    description,
    actionText,
    icon = 'book',
    onAction,
    containerStyle,
    submessage,
    customActionButton,
    iconSize = DEFAULT_ICON_SIZE,
    hideArticlesButton = false,
  }: EmptyStateProps) => {
    const colors = useColors(); // Source colors internally

    const defaultActionButton = !hideArticlesButton && (
      <ThemedButton
        style={styles.customActionButton}
        title={STRINGS.BROWSE_ARTICLES}
        onPress={handleBrowseArticles}
      />
    );

    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.contentContainer}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons
                color={colors.tint}
                name={icon as ComponentProps<typeof Ionicons>['name']}
                size={iconSize}
                style={styles.icon}
              />
            </View>
          )}

          <View style={styles.textContent}>
            <ThemedText align="center" style={styles.title} type="body" weight="bold">
              {title}
            </ThemedText>

            {description && (
              <ThemedText
                align="center"
                style={styles.description}
                type="body"
                variant="secondary"
                weight="bold"
              >
                {description}
              </ThemedText>
            )}

            {submessage && (
              <ThemedText align="center" style={styles.submessage} type="body" variant="subtle">
                {submessage}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.actionArea}>
          {customActionButton ||
            defaultActionButton ||
            (actionText && onAction && (
              <ThemedButton
                icon={icon}
                style={styles.customActionButton}
                title={actionText}
                onPress={onAction}
              />
            ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  actionArea: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  contentContainer: {
    alignItems: 'center',
    maxWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 7 - LAYOUT.SPACING.LARGE,
  },
  customActionButton: {
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 4 - LAYOUT.SPACING.MEDIUM,
  },
  description: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  icon: {},
  iconContainer: {
    alignItems: 'center',
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 2,
  },
  submessage: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  textContent: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  title: {
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
