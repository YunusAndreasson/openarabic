import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import type { AudioLanguagePreference } from '@/store/settingsSlice';
import { setAudioLanguagePreference } from '@/store/settingsSlice';
import { selectionFeedback } from '@/utils/haptics';

interface AudioLanguageSelectorProps {
  style?: any;
}

const AudioLanguageSelector: React.FC<AudioLanguageSelectorProps> = ({ style }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();

  const audioPreference = useAppSelectorMemo(state => state.settings.audioLanguagePreference);

  const handlePreferenceChange = useCallback(
    (preference: AudioLanguagePreference) => {
      selectionFeedback();
      dispatch(setAudioLanguagePreference(preference));
    },
    [dispatch]
  );

  const renderOption = (value: AudioLanguagePreference, label: string) => {
    const isSelected = audioPreference === value;

    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.option,
          {
            borderColor: isSelected ? colors.tint : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => handlePreferenceChange(value)}
        activeOpacity={0.7}
      >
        <ThemedText
          style={styles.optionLabel}
          type="body"
          weight="medium"
          colorName={isSelected ? 'tint' : 'text'}
        >
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <View style={styles.cardIconContainer}>
            <Ionicons
              color={colors.interactiveSecondary}
              name="volume-high"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            />
          </View>
          <ThemedText style={styles.cardText} type="body" weight="medium">
            {STRINGS.AUDIO_LANGUAGE}
          </ThemedText>
        </View>
      </View>

      <View style={styles.optionsContainer}>
        {renderOption('arabic', STRINGS.AUDIO_LANGUAGE_ARABIC)}
        {renderOption('bilingual', STRINGS.AUDIO_LANGUAGE_BILINGUAL)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Remove padding since this component is already inside a BaseCard
    // that provides proper spacing
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  cardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  cardText: {
    marginLeft: LAYOUT.SPACING.MEDIUM, // Increased from SMALL for consistency
  },
  optionsContainer: {
    gap: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.MEDIUM,
    // Subtle nesting under the header label
    marginLeft: LAYOUT.SPACING.MEDIUM,
  },
  option: {
    borderWidth: 1,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    textAlign: 'center',
  },
});

export default memo(AudioLanguageSelector);
