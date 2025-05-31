import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo } from 'react';
import type { ComponentType, ComponentProps } from 'react';
import { View, StyleSheet } from 'react-native';

import type { EmptyStateProps } from '@/types/ui/layout.types';

import { LAYOUT } from '../constants/layout';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

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
  }: Partial<EmptyStateProps> & Pick<EmptyStateProps, 'title' | 'description' | 'colors'>) => {
    const IconComponent = (icon && typeof icon !== 'string' ? icon : Ionicons) as ComponentType<
      ComponentProps<typeof Ionicons>
    >;
    const iconName = typeof icon === 'string' ? icon : 'alert-circle-outline';

    const handleBrowseArticles = () => {
      router.push('/(tabs)');
    };

    const defaultActionButton = !hideArticlesButton && (
      <ThemedButton
        title="Browse Articles"
        onPress={handleBrowseArticles}
        variant="filled"
        size="medium"
        style={styles.customActionButton}
        textWeight="bold"
        accessibilityLabel="Browse articles"
        accessibilityRole="button"
      />
    );

    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.contentContainer}>
          {icon && (
            <View style={[styles.iconContainer, iconContainerStyle]}>
              <IconComponent
                name={iconName}
                size={iconSize}
                color={colors?.tint}
                style={styles.icon}
                accessibilityLabel={`${title} illustration`}
              />
            </View>
          )}

          <View style={styles.textContent}>
            <ThemedText type="body" weight="bold" style={styles.title} align="center">
              {title}
            </ThemedText>

            {description && (
              <ThemedText
                type="body"
                weight="bold"
                variant="secondary"
                align="center"
                style={styles.description}
              >
                {description}
              </ThemedText>
            )}

            {submessage && (
              <ThemedText type="body" variant="subtle" align="center" style={styles.submessage}>
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
                title={actionText}
                icon={typeof icon === 'string' ? icon : undefined}
                onPress={onAction}
                style={styles.customActionButton}
              />
            ))}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  actionArea: {
    marginTop: LAYOUT.SPACING.XLARGE,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.XLARGE,
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
    padding: LAYOUT.SPACING.XLARGE,
    width: '100%',
  },
  contentContainer: {
    alignItems: 'center',
    maxWidth: 320,
  },
  customActionButton: {
    minWidth: 180,
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
    marginBottom: LAYOUT.SPACING.XLARGE,
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
    letterSpacing: -0.5,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
