import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import type { AudioLanguagePreference } from '@/store/settingsSlice';
import { setAudioLanguagePreference } from '@/store/settingsSlice';
import { lightFeedback } from '@/utils/haptics';

export interface AudioLanguagePickerProps {
  isVisible: boolean;
  onClose: () => void;
}

interface AudioLanguageOption {
  id: AudioLanguagePreference;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const AUDIO_LANGUAGE_OPTIONS: AudioLanguageOption[] = [
  {
    id: 'arabic',
    title: STRINGS.AUDIO_LANGUAGE_ARABIC,
    subtitle: 'Audio plays in Arabic with English subtitles',
    icon: 'volume-high',
  },
  {
    id: 'bilingual',
    title: STRINGS.AUDIO_LANGUAGE_BILINGUAL,
    subtitle: 'Audio plays in both Arabic and English',
    icon: 'language',
  },
];

// Use smaller snap point since we only have 2 options
const SNAP_POINTS = [320];

export const AudioLanguagePicker: FC<AudioLanguagePickerProps> = memo(({ isVisible, onClose }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const currentAudioLanguage = useAppSelectorMemo(state => state.settings.audioLanguagePreference);
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Snap point is static so define outside component
  const snapPoints = SNAP_POINTS;

  // Show/hide modal based on isVisible prop (same pattern as ThemePicker)
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const handleAudioLanguageSelect = useCallback(
    (language: AudioLanguagePreference) => {
      dispatch(setAudioLanguagePreference(language));
      lightFeedback();
    },
    [dispatch]
  );

  // Use built-in backdrop component (same as ThemePicker)
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={onClose} />
    ),
    [onClose]
  );

  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator]
  );

  // Only render when visible (same pattern as ThemePicker)
  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      animateOnMount={true}
      activeOffsetY={[-10, 10]}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold">
            {STRINGS.AUDIO_LANGUAGE}
          </ThemedText>
        </View>

        {/* Audio Language Options */}
        <View style={styles.optionsContainer}>
          {AUDIO_LANGUAGE_OPTIONS.map(option => {
            const isSelected = currentAudioLanguage === option.id;

            return (
              <BaseCard
                key={option.id}
                shadowSize="small"
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? colors.tintBackground : colors.elevation2,
                    borderColor: isSelected ? colors.tint : colors.borderOverlay,
                    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
                  },
                ]}
                onPress={() => handleAudioLanguageSelect(option.id)}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardIconContainer}>
                      <Ionicons
                        name={option.icon}
                        size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                        color={colors.text}
                      />
                    </View>
                    <View style={styles.optionContent}>
                      <ThemedText
                        type="body"
                        weight="medium"
                        style={[
                          styles.optionTitle,
                          { color: isSelected ? colors.tint : colors.text },
                        ]}
                      >
                        {option.title}
                      </ThemedText>
                      <ThemedText type="caption" variant="secondary" style={styles.optionSubtitle}>
                        {option.subtitle}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              </BaseCard>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

AudioLanguagePicker.displayName = 'AudioLanguagePicker';

const styles = StyleSheet.create({
  bottomSheet: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    // Styling handled via dynamicStyles
  },
  container: {
    paddingBottom: LAYOUT.SPACING.SMALL, // Significantly reduced to fix excessive padding
  },
  header: {
    ...LAYOUT.BOTTOM_SHEET.HEADER,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  optionsContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  optionCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  // Use same card layout as account screen
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  cardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  optionContent: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  optionTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  optionSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});
