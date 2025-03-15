import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT, getPlatformTopPadding } from '../constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';

interface PageHeaderProps {
  /**
   * Title text for the header
   */
  title: string;

  /**
   * Optional callback for when the back button is pressed
   * If provided, a back button will be shown
   */
  onBackPress?: () => void;
}

/**
 * A reusable page header component with consistent styling
 */
const PageHeader = React.memo(({ title, onBackPress }: PageHeaderProps) => {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {onBackPress && (
        <TouchableOpacity
          onPress={onBackPress}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      <ThemedText style={[styles.title, onBackPress && styles.titleWithBack]}>{title}</ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: getPlatformTopPadding(),
    paddingBottom: LAYOUT.SPACING.TINY,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  titleWithBack: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  backButton: {
    padding: LAYOUT.SPACING.TINY,
    marginLeft: -LAYOUT.SPACING.TINY,
  },
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
