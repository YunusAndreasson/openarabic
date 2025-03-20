import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import BaseCard from './BaseCard';

interface InfoCardProps {
  /**
   * Main title or label for the card
   */
  title?: string;

  /**
   * Value to display (for stat cards)
   */
  value?: string | number;

  /**
   * Optional secondary label/description text
   */
  description?: string;

  /**
   * Ionicons icon name
   */
  icon?: string;

  /**
   * Background color for the icon container
   */
  iconBgColor?: string;

  /**
   * Color for the icon itself
   */
  iconColor?: string;

  /**
   * Optional callback when card is pressed
   */
  onPress?: () => void;

  /**
   * Whether to animate the value (for stat cards)
   */
  animateValue?: boolean;

  /**
   * Additional styles for the container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Additional styles for title text
   */
  titleStyle?: StyleProp<TextStyle>;

  /**
   * Additional styles for description text
   */
  descriptionStyle?: StyleProp<TextStyle>;

  /**
   * Additional styles for value text
   */
  valueStyle?: StyleProp<TextStyle>;

  /**
   * Layout mode for the card content
   * - 'row': Icon on left, text on right (default for statistics)
   * - 'column': Icon on top, text below (default for info/category cards)
   * - 'row-reversed': Text on left, icon on right
   */
  layoutMode?: 'row' | 'column' | 'row-reversed';

  /**
   * Children to render inside the card (optional)
   */
  children?: React.ReactNode;

  /**
   * Whether to hide the title in the header and only show in content
   */
  hideTitle?: boolean;

  /**
   * Shadow size for the card
   */
  shadowSize?: 'small' | 'medium' | 'large';

  /**
   * Whether to animate the card
   */
  animated?: boolean;
}

/**
 * A flexible card component for displaying information or statistics
 * Can be used for both statistics cards and information/category cards
 */
const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  description,
  icon,
  iconBgColor,
  iconColor,
  onPress,
  animateValue = false,
  style,
  titleStyle,
  descriptionStyle,
  valueStyle,
  layoutMode = 'row',
  children,
  hideTitle = false,
  shadowSize = 'small',
  animated = false,
}) => {
  const colors = useColors();

  // Default colors if not provided
  const bgColor = iconBgColor || colors.text + '30';
  const iconClr = iconColor || colors.text;

  // Determine if this is a stat card (has a value)
  const isStatCard = value !== undefined;

  // Render the icon if provided
  const renderIcon = () => {
    if (!icon) return null;

    return (
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon as any} size={22} color={iconClr} />
      </View>
    );
  };

  // Render title section
  const renderTitle = () => {
    if (hideTitle || !title) return null;

    return (
      <View style={styles.headerRow}>
        {layoutMode !== 'row-reversed' && renderIcon()}
        <ThemedText style={[styles.title, titleStyle]}>{title}</ThemedText>
        {layoutMode === 'row-reversed' && renderIcon()}
      </View>
    );
  };

  // Render content section
  const renderContent = () => {
    // If children are provided, render them instead of default content
    if (children) {
      return children;
    }

    return (
      <View
        style={[
          styles.contentRow,
          layoutMode === 'column' && styles.contentColumn,
          !hideTitle && layoutMode !== 'column' && { marginTop: LAYOUT.SPACING.SMALL },
        ]}
      >
        {/* For layout modes that need the icon in the content area */}
        {(hideTitle || layoutMode === 'column') && layoutMode !== 'row-reversed' && renderIcon()}

        <View
          style={[
            styles.textContainer,
            layoutMode === 'column' && { marginTop: LAYOUT.SPACING.SMALL },
            layoutMode !== 'column' && hideTitle && { flex: 1 },
          ]}
        >
          {/* Show value for stat cards */}
          {isStatCard && <ThemedText style={[styles.value, valueStyle]}>{value}</ThemedText>}

          {/* Show title here if hideTitle is true (for column layout) */}
          {hideTitle && title && layoutMode === 'column' && (
            <ThemedText style={[styles.contentTitle, titleStyle]}>{title}</ThemedText>
          )}

          {/* Description text */}
          {description && (
            <ThemedText style={[styles.description, descriptionStyle]}>{description}</ThemedText>
          )}
        </View>

        {/* For reversed layout, icon goes at the end */}
        {(hideTitle || layoutMode === 'column') && layoutMode === 'row-reversed' && renderIcon()}
      </View>
    );
  };

  return (
    <BaseCard
      onPress={onPress}
      style={[styles.container, style]}
      shadowSize={shadowSize}
      animated={animated}
    >
      {renderTitle()}
      {renderContent()}
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contentColumn: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.SMALL,
    alignSelf: 'flex-start',
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    flex: 1,
  },
  contentTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  description: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
});

export default React.memo(InfoCard);
