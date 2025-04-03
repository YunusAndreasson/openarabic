import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedButton } from './ThemedButton';
import { LAYOUT } from '../constants/layout';
import { EmptyStateProps } from '@/types/ui/layout.types';
import { withOpacity } from '@/utils/colorUtils';
import { Ionicons } from '@expo/vector-icons';

/**
 * A reusable empty state component that displays a title, message, and optional action button
 * Supports both standard button and custom action button layouts
 */
const EmptyState = React.memo(
  ({
    title,
    description,
    actionText,
    icon,
    onAction,
    containerStyle,
    colors,
    submessage,
    customActionButton,
    iconSize = 24,
    iconContainerStyle,
  }: EmptyStateProps) => {
    const IconComponent = icon && typeof icon !== 'string' ? icon : Ionicons;
    const iconName = typeof icon === 'string' ? icon : 'alert-circle-outline';

    return (
      <View style={[styles.container, containerStyle]}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors ? withOpacity(colors.text, 0.1) : undefined },
              iconContainerStyle,
            ]}
          >
            <IconComponent
              name={iconName}
              size={iconSize}
              color={colors?.text}
              style={styles.icon}
              accessibilityLabel={`Empty state icon for ${title}`}
            />
          </View>
        )}

        <View style={styles.titleContainer}>
          <ThemedText type="heading2" align="center" accessibilityRole="header">
            {title}
          </ThemedText>
        </View>

        <View style={styles.messageContainer}>
          <ThemedText type="bodyBold" variant="secondary" align="center">
            {description}
          </ThemedText>
        </View>

        {submessage && (
          <View style={styles.submessageContainer}>
            <ThemedText type="body" variant="subtle" align="center">
              {submessage}
            </ThemedText>
          </View>
        )}

        {customActionButton
          ? customActionButton
          : actionText &&
            onAction && (
              <ThemedButton
                title={actionText}
                icon={typeof icon === 'string' ? icon : undefined}
                onPress={onAction}
              />
            )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  },
  icon: {
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
  },
  messageContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  submessageContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
