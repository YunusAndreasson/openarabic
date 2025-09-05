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
import { setDailyWordLimit } from '@/store/settingsSlice';
import { lightFeedback } from '@/utils/haptics';

export interface DailyWordLimitPickerProps {
  isVisible: boolean;
  onClose: () => void;
}

interface WordLimitOption {
  id: number;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const WORD_LIMIT_OPTIONS: WordLimitOption[] = [
  {
    id: 10,
    title: STRINGS.DAILY_WORD_LIMIT_GETTING_STARTED,
    subtitle: STRINGS.DAILY_WORD_LIMIT_GETTING_STARTED_DESC,
    icon: 'school',
  },
  {
    id: 20,
    title: STRINGS.DAILY_WORD_LIMIT_STEADY,
    subtitle: STRINGS.DAILY_WORD_LIMIT_STEADY_DESC,
    icon: 'trending-up',
  },
  {
    id: 30,
    title: STRINGS.DAILY_WORD_LIMIT_ACTIVE,
    subtitle: STRINGS.DAILY_WORD_LIMIT_ACTIVE_DESC,
    icon: 'flash',
  },
  {
    id: 0,
    title: STRINGS.DAILY_WORD_LIMIT_UNLIMITED,
    subtitle: STRINGS.DAILY_WORD_LIMIT_UNLIMITED_DESC,
    icon: 'infinite',
  },
];

const SNAP_POINTS = [440];

export const DailyWordLimitPicker: FC<DailyWordLimitPickerProps> = memo(
  ({ isVisible, onClose }) => {
    const colors = useColors();
    const dispatch = useAppDispatch();
    const currentLimit = useAppSelectorMemo(state => state.settings.dailyWordLimit);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = SNAP_POINTS;

    useEffect(() => {
      if (isVisible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [isVisible]);

    const handleLimitSelect = useCallback(
      (limit: number) => {
        dispatch(setDailyWordLimit(limit));
        lightFeedback();
      },
      [dispatch]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          onPress={onClose}
        />
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
          <View style={styles.header}>
            <ThemedText type="heading3" weight="bold">
              {STRINGS.DAILY_WORD_LIMIT}
            </ThemedText>
          </View>

          <View style={styles.optionsContainer}>
            {WORD_LIMIT_OPTIONS.map(option => {
              const isSelected = currentLimit === option.id;

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
                  onPress={() => handleLimitSelect(option.id)}
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
                        <ThemedText
                          type="caption"
                          variant="secondary"
                          style={styles.optionSubtitle}
                        >
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
  }
);

DailyWordLimitPicker.displayName = 'DailyWordLimitPicker';

const styles = StyleSheet.create({
  bottomSheet: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    width: LAYOUT.COMPONENT.PROGRESS_BAR_WIDTH,
    height: LAYOUT.PROGRESS_BAR.HEIGHT,
  },
  container: {
    paddingBottom: LAYOUT.SPACING.SMALL,
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
  // Use same card layout as other bottom sheets
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
