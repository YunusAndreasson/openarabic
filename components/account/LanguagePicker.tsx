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
import type { DisplayLanguagePreference } from '@/store/settingsSlice';
import { setDisplayLanguagePreference } from '@/store/settingsSlice';
import { DisplayLanguage } from '@/types/enums';
import { lightFeedback } from '@/utils/haptics';

export interface LanguagePickerProps {
  isVisible: boolean;
  onClose: () => void;
}

interface LanguageOption {
  id: DisplayLanguagePreference;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: DisplayLanguage.ARABIC_ONLY,
    title: STRINGS.DISPLAY_LANGUAGE_ARABIC,
    subtitle: 'Text displays in Arabic script with English translations',
    icon: 'text',
  },
  {
    id: DisplayLanguage.ARABIC_ENGLISH,
    title: STRINGS.DISPLAY_LANGUAGE_BILINGUAL,
    subtitle: 'Text shows both Arabic and English side by side',
    icon: 'language',
  },
];

// Use smaller snap point since we only have 2 options
const SNAP_POINTS = [320];

export const LanguagePicker: FC<LanguagePickerProps> = memo(({ isVisible, onClose }) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelectorMemo(state => state.settings.displayLanguagePreference);
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

  const handleLanguageSelect = useCallback(
    (language: DisplayLanguagePreference) => {
      dispatch(setDisplayLanguagePreference(language));
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
            {STRINGS.DISPLAY_LANGUAGE}
          </ThemedText>
        </View>

        {/* Language Options */}
        <View style={styles.optionsContainer}>
          {LANGUAGE_OPTIONS.map(option => {
            const isSelected = currentLanguage === option.id;

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
                onPress={() => handleLanguageSelect(option.id)}
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

LanguagePicker.displayName = 'LanguagePicker';

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
