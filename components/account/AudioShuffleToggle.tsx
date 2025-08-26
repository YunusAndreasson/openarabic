import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Toggle } from '@/components/ui/Toggle';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import { setAudioShuffleEnabled } from '@/store/settingsSlice';
import { selectionFeedback } from '@/utils/haptics';

interface AudioShuffleToggleProps {
  style?: any;
}

const AudioShuffleToggle: React.FC<AudioShuffleToggleProps> = ({ style }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();

  const audioShuffleEnabled = useAppSelectorMemo(state => state.settings.audioShuffleEnabled);

  const handleToggleChange = useCallback(
    (enabled: boolean) => {
      selectionFeedback();
      dispatch(setAudioShuffleEnabled(enabled));
    },
    [dispatch]
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={styles.cardIconContainer}>
            <Ionicons
              color={colors.interactiveSecondary}
              name="shuffle"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            />
          </View>
          <ThemedText style={styles.cardText} type="body" weight="medium">
            {STRINGS.AUDIO_SHUFFLE}
          </ThemedText>
        </View>
        <Toggle value={audioShuffleEnabled} onValueChange={handleToggleChange} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    width: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
    height: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  cardText: {
    // Text styling for the toggle label
  },
});

export default AudioShuffleToggle;
