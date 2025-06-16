import { Ionicons } from '@expo/vector-icons';
import { memo, type FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface ReviewBottomActionsProps {
  onShowMeaning: () => void;
  onManageWord: () => void;
  hasCurrentWord: boolean;
}

const ReviewBottomActions: FC<ReviewBottomActionsProps> = memo(
  ({ onShowMeaning, onManageWord, hasCurrentWord }) => {
    const colors = useColors();

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.elevation2 }]}
          onPress={onShowMeaning}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          testID="show-meaning-button"
        >
          <Ionicons
            name="help-circle-outline"
            size={LAYOUT.BUTTON.ICON_SIZE.LARGE}
            color={colors.captionText}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.elevation2 },
            !hasCurrentWord && { opacity: LAYOUT.OPACITY.SUBTLE },
          ]}
          onPress={onManageWord}
          disabled={!hasCurrentWord}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          testID="manage-word-button"
        >
          <Ionicons
            name="cog-outline"
            size={LAYOUT.BUTTON.ICON_SIZE.LARGE}
            color={colors.captionText}
          />
        </TouchableOpacity>
      </View>
    );
  }
);

ReviewBottomActions.displayName = 'ReviewBottomActions';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    marginTop: 'auto',
    height: 80,
  },
  actionButton: {
    width: LAYOUT.TOUCH_TARGET.MIN_CONTAINER.WIDTH,
    height: LAYOUT.TOUCH_TARGET.MIN_CONTAINER.HEIGHT,
    borderRadius: LAYOUT.TOUCH_TARGET.MIN_CONTAINER.WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.ELEVATION.SMALL,
  },
});

export default ReviewBottomActions;
