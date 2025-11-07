import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Toggle } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setHapticsEnabled } from '@/store/settingsSlice';
import { selectionFeedback } from '@/utils/haptics';

interface HapticsToggleProps {
  style?: StyleProp<ViewStyle>;
}

export const HapticsToggle: React.FC<HapticsToggleProps> = ({ style }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();

  const hapticsEnabled = useAppSelectorShallow(state => state.settings.hapticsEnabled);

  const handleToggleChange = useCallback(
    (enabled: boolean) => {
      selectionFeedback();
      dispatch(setHapticsEnabled(enabled));
    },
    [dispatch],
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.cardLeft}>
        <View style={styles.cardIconContainer}>
          <Ionicons
            color={colors.interactiveSecondary}
            name="phone-portrait-outline"
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
          />
        </View>
        <View style={styles.textContainer}>
          <ThemedText weight="medium">{STRINGS.HAPTICS}</ThemedText>
          <ThemedText colorName="textTertiary" style={styles.subtext} type="caption">
            {STRINGS.HAPTICS_DESCRIPTION}
          </ThemedText>
        </View>
      </View>
      <Toggle value={hapticsEnabled} onValueChange={handleToggleChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  textContainer: {
    flexDirection: 'column',
    marginLeft: LAYOUT.SPACING.MEDIUM,
    flex: 1,
  },
  subtext: {
    marginTop: LAYOUT.SPACING.TINY,
  },
});
