// Deliberately NOT @expo/ui/community/slider: its SliderProps has no
// onSlidingStart/onSlidingComplete and no accessibility pass-through. This
// slider commits to persisted state once per drag (handleSlidingComplete →
// setFontSize); driving that from onValueChange would write to redux-persist on
// every frame and re-render every Arabic sample with it. The community package
// is not deprecated — revisit only if @expo/ui grows a release event.
import { Ionicons } from '@/components/ui';
import Slider from '@react-native-community/slider';
import { useState, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BaseCard, OptionCard } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import {
  useArabicFontSelector,
  type ArabicFontOption,
} from '@/hooks/account/useArabicFontSelector';
import { useColors } from '@/hooks/theme/useColors';
import type { ArabicFontName } from '@/store/settingsSlice';

interface FontPreviewCardProps {
  option: ArabicFontOption;
  isSelected: boolean;
  fontSize: number;
  onSelect: (fontName: ArabicFontName) => void;
}

function FontPreviewCard({ option, isSelected, fontSize, onSelect }: FontPreviewCardProps) {
  const colors = useColors();

  const handlePress = () => {
    onSelect(option.name);
  };

  return (
    <OptionCard
      accessibilityLabel={`${option.displayName}. ${option.description}`}
      selected={isSelected}
      style={styles.fontCard}
      onPress={handlePress}
    >
      <View style={styles.fontHeader}>
        <View style={styles.fontTitleRow}>
          <ThemedText style={styles.fontName} type="body" weight="semibold">
            {option.displayName}
          </ThemedText>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.tint}
            />
          )}
        </View>
        <ThemedText colorName="textTertiary" style={styles.fontDescription} type="caption">
          {option.description}
        </ThemedText>
      </View>

      <ThemedText
        colorName="arabicText"
        style={[styles.previewText, { fontFamily: option.name, fontSize }]}
        type="arabic"
      >
        {option.previewText}
      </ThemedText>
    </OptionCard>
  );
}

FontPreviewCard.displayName = 'FontPreviewCard';

export const ArabicFontSelector: FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selectedFont, selectedFontSize, fontOptions, selectFont, setFontSize, fontSizeRange } =
    useArabicFontSelector();

  // Local UI state to avoid dispatching on every slider tick
  const [localFontSize, setLocalFontSize] = useState<number>(selectedFontSize);
  const [isSliding, setIsSliding] = useState<boolean>(false);

  const handleSlidingStart = () => {
    setIsSliding(true);
  };

  const handleSlidingComplete = (value: number) => {
    setIsSliding(false);
    setFontSize(value);
  };

  const displayFontSize = isSliding ? localFontSize : selectedFontSize;

  const scrollContentStyle = {
    gap: LAYOUT.SPACING.SMALL,
    paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
  };

  return (
    <View style={styles.container}>
      <BaseCard shadowSize="small" style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <ThemedText type="body">{STRINGS.FONT_SIZE}</ThemedText>
          <ThemedText colorName="textTertiary" type="caption">
            {Math.round(displayFontSize)}px
          </ThemedText>
        </View>
        <View style={styles.sliderRow}>
          <ThemedText colorName="textTertiary" style={styles.sliderLabel}>
            A
          </ThemedText>
          <Slider
            accessibilityLabel={STRINGS.FONT_SIZE}
            accessibilityRole="adjustable"
            accessibilityValue={{
              min: fontSizeRange.MIN,
              max: fontSizeRange.MAX,
              now: Math.round(displayFontSize),
              text: `${Math.round(displayFontSize)} pixels`,
            }}
            style={styles.slider}
            minimumValue={fontSizeRange.MIN}
            maximumValue={fontSizeRange.MAX}
            step={fontSizeRange.STEP}
            value={localFontSize}
            onValueChange={setLocalFontSize}
            onSlidingStart={handleSlidingStart}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor={colors.tint}
            maximumTrackTintColor={colors.borderOverlay}
            thumbTintColor={colors.tint}
          />
          <ThemedText colorName="textTertiary" style={styles.sliderLabelLarge}>
            A
          </ThemedText>
        </View>
      </BaseCard>

      <ScrollView
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {fontOptions.map(option => (
          <FontPreviewCard
            key={option.name}
            isSelected={selectedFont === option.name}
            fontSize={displayFontSize}
            option={option}
            onSelect={selectFont}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  sliderCard: {
    padding: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  sliderLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  sliderLabelLarge: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
  },
  slider: {
    flex: 1,
    height: LAYOUT.BUTTON.HEIGHT.LARGE - LAYOUT.SPACING.SMALL,
  },
  scrollView: {
    flex: 1,
  },
  fontCard: {
    padding: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  fontHeader: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  fontTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  fontName: {
    textAlign: 'center',
  },
  fontDescription: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.HOVER,
  },
  previewText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    minHeight: LAYOUT.CARD.HEIGHT.LIST_ITEM,
    textAlignVertical: 'center',
  },
});
