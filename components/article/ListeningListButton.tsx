import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';
import { lightFeedback } from '@/utils/haptics';

interface ListeningListButtonProps {
  isInReadingList: boolean;
  isLoading?: boolean;
  onPress: () => void;
  colors: ThemeColors;
}

export const ListeningListButton: React.FC<ListeningListButtonProps> = ({
  isInReadingList,
  isLoading = false,
  onPress,
  colors,
}) => {
  // Dynamic styles based on state and theme
  const styles = useMemo(() => {
    const isActive = isInReadingList;

    return {
      container: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
        borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
        paddingHorizontal: LAYOUT.SPACING.MEDIUM,
        paddingVertical: LAYOUT.SPACING.SMALL,
        marginTop: LAYOUT.SPACING.MEDIUM,
        minHeight: 48, // Touch target size per Fitts' Law
        shadowColor: colors.shadow,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        opacity: isLoading ? 0.6 : 1,
      },
      iconContainer: {
        marginRight: LAYOUT.SPACING.SMALL,
      },
      icon: {
        color: isActive ? colors.primaryForeground : colors.text,
      },
      text: {
        color: isActive ? colors.primaryForeground : colors.text,
        fontWeight: '600' as const,
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        letterSpacing: 0.2,
      },
    };
  }, [isInReadingList, isLoading, colors]);

  // Dynamic content based on state
  const buttonContent = useMemo(() => {
    if (isInReadingList) {
      return {
        icon: 'checkmark-circle' as const,
        text: 'Saved for listening',
        accessibilityLabel: 'Remove from listening list',
      };
    } else {
      return {
        icon: 'add-circle-outline' as const,
        text: 'Save for listening',
        accessibilityLabel: 'Add to listening list',
      };
    }
  }, [isInReadingList]);

  const handlePress = () => {
    if (isLoading) return;
    lightFeedback();
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={isLoading}
      accessibilityLabel={buttonContent.accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        selected: isInReadingList,
        disabled: isLoading,
      }}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={buttonContent.icon} size={20} style={styles.icon} />
      </View>
      <ThemedText style={styles.text} type="bodyBold" skipDefaultColor>
        {buttonContent.text}
      </ThemedText>
    </TouchableOpacity>
  );
};
