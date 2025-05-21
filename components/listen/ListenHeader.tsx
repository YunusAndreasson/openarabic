import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CloseButton } from '@/components/CloseButton';
import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';

interface ListenHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onClose: () => void;
  repeatEnabled?: boolean;
  onRepeatToggle?: () => void;
}

const ListenHeader: React.FC<ListenHeaderProps> = ({
  progress,
  maxProgress,
  animationKey,
  onClose,
  repeatEnabled = false,
  onRepeatToggle,
}) => {
  const colors = useColors();

  const handleRepeatPress = () => {
    if (onRepeatToggle) {
      lightFeedback();
      onRepeatToggle();
    }
  };

  // Determine repeat icon color based on enabled state
  const repeatIconColor = repeatEnabled ? colors.tint : colors.tabIconDefault;

  return (
    <View style={styles.header}>
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={Math.max(progress, maxProgress)}
          animationTriggered={animationKey > 1}
          key={animationKey}
          animationDuration={500}
        />
      </View>

      <View style={styles.controlsContainer}>
        {onRepeatToggle && (
          <TouchableOpacity
            onPress={handleRepeatPress}
            style={styles.repeatButton}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            accessibilityLabel={repeatEnabled ? 'Disable repeat' : 'Enable repeat'}
          >
            <Ionicons name="repeat" size={22} color={repeatIconColor} />
          </TouchableOpacity>
        )}
        <CloseButton
          onPress={onClose}
          size="large"
          iconSize={24}
          color={colors.tabIconDefault}
          hapticFeedback={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.LARGE,
    width: '100%',
    zIndex: 1,
  },
  progressContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatButton: {
    padding: LAYOUT.SPACING.SMALL,
  },
});

export default ListenHeader;
