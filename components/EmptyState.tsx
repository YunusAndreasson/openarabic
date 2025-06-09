import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo } from 'react';
import type { ComponentType, ComponentProps } from 'react';
import { View, StyleSheet } from 'react-native';

import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

// Define EmptyStateProps inline
interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  icon?: string | ComponentType<any>;
  onAction?: () => void;
  containerStyle?: any;
  colors: { tint: string };
  submessage?: string;
  customActionButton?: React.ReactNode;
  iconSize?: number;
  iconContainerStyle?: any;
  hideArticlesButton?: boolean;
}

const DEFAULT_ICON_SIZE = 64;

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
    icon = 'book-outline',
    onAction,
    containerStyle,
    colors,
    submessage,
    customActionButton,
    iconSize = DEFAULT_ICON_SIZE,
    iconContainerStyle,
    hideArticlesButton = false,
  }: Partial<EmptyStateProps> & Pick<EmptyStateProps, 'colors' | 'description' | 'title'>) => {
    const IconComponent = (icon && typeof icon !== 'string' ? icon : Ionicons) as ComponentType<
      ComponentProps<typeof Ionicons>
    >;
    const iconName = typeof icon === 'string' ? icon : 'alert-circle-outline';

    const handleBrowseArticles = () => {
      router.push('/(tabs)');
    };

    const defaultActionButton = !hideArticlesButton && (
      <ThemedButton
        size="medium"
        style={styles.customActionButton}
        textWeight="bold"
        title="Browse Articles"
        variant="filled"
        onPress={handleBrowseArticles}
      />
    );

    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.contentContainer}>
          {icon && (
            <View style={[styles.iconContainer, iconContainerStyle]}>
              <IconComponent
                color={colors?.tint}
                name={iconName as any}
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
                icon={typeof icon === 'string' ? icon : undefined}
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
    marginTop: LAYOUT.SPACING.LARGE,
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
    maxWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 7 - LAYOUT.SPACING.LARGE, // ~320px
  },
  customActionButton: {
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 4 - LAYOUT.SPACING.MEDIUM, // ~180px
  },
  description: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  icon: {
    // Remove transform for more consistent sizing
  },
  iconContainer: {
    alignItems: 'center',
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
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
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT + 0.2,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
