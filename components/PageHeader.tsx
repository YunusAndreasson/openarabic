import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT, getPlatformTopPadding } from '../constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { PageHeaderProps } from '@/types/ui.types';

/**
 * A reusable page header component with consistent styling
 */
const PageHeader = React.memo(({ title, onBackPress }: PageHeaderProps) => {
  const colors = useColors();

  const handleBackPress = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    }
  }, [onBackPress]);

  return (
    <View style={styles.container}>
      {onBackPress && (
        <Pressable
          onPress={handleBackPress}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? colors.textOverlay : 'transparent',
              opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1,
            },
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.tint} />
        </Pressable>
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
    padding: LAYOUT.SPACING.SMALL,
    marginLeft: -LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
