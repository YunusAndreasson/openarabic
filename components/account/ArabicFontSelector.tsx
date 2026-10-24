// Deliberately NOT @expo/ui/community/slider: its SliderProps has no
// onSlidingStart/onSlidingComplete (it does pass accessibilityLabel and -Hint
// through now, though still no accessibilityValue). This slider commits to
// persisted state once per drag (handleSlidingComplete → setFontSize); driving
// that from onValueChange would write to redux-persist on every frame and
// re-render every Arabic sample with it. The community package is not
// deprecated — revisit only if @expo/ui grows a release event.
import { Icon } from '@/components/ui';
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BaseCard, OptionCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, getArabicTextStyle } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import {
  useArabicFontSelector,
  type ArabicFontOption,
} from '@/hooks/account/useArabicFontSelector';
import { useColors } from '@/hooks/theme/useColors';
import type { ArabicFontName } from '@/store/settingsSlice';
import { fillTemplate } from '@/utils/fillTemplate';

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
            <Icon
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

      {/* The whole Arabic style is derived from `fontSize`, not just the size.
          `type="arabic"` sizes its line box from the *persisted* size, which the
          slider only writes on release — so overriding the size alone left every
          preview mid-drag with a line box built for the old size, shearing the
          tops off the harakat in all four fully-vocalized samples. */}
      <ThemedText
        colorName="arabicText"
        style={[getArabicTextStyle(fontSize, {}, option.name), styles.previewText]}
        type="arabic"
      >
        {option.previewText}
      </ThemedText>
    </OptionCard>
  );
}

FontPreviewCard.displayName = 'FontPreviewCard';

export const ArabicFontSelector = () => {
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
  const roundedFontSize = Math.round(displayFontSize);

  const scrollContentStyle = {
    gap: LAYOUT.SPACING.SMALL,
    paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
  };

  return (
    <View style={styles.container}>
      <BaseCard style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <ThemedText type="body">{STRINGS.FONT_SIZE}</ThemedText>
          <ThemedText colorName="textTertiary" type="caption">
            {fillTemplate(STRINGS.FONT_SIZE_VALUE, { size: roundedFontSize })}
          </ThemedText>
        </View>
        <View style={styles.sliderRow}>
          <ThemedText colorName="textTertiary" style={styles.sliderLabel}>
            {STRINGS.FONT_SIZE_SAMPLE_LETTER}
          </ThemedText>
          <Slider
            accessibilityLabel={STRINGS.FONT_SIZE}
            accessibilityRole="adjustable"
            accessibilityValue={{
              min: fontSizeRange.MIN,
              max: fontSizeRange.MAX,
              now: roundedFontSize,
              text: fillTemplate(STRINGS.FONT_SIZE_VALUE_A11Y, { size: roundedFontSize }),
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
            {STRINGS.FONT_SIZE_SAMPLE_LETTER}
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
  // Deliberately NOT `alignItems: 'center'`. That centred the card's children by
  // shrinking them to their content, and BaseCard nests two more auto-width
  // views between the card and its children — so the Arabic sample was measured
  // at whatever width it wanted, the row was sized from that, and the text was
  // then re-laid out inside it. Every child here centres itself instead, which
  // leaves the sample a full-width box: one width for both passes, so what it
  // measures is what it paints.
  fontCard: {
    padding: LAYOUT.SPACING.MEDIUM,
  },
  fontHeader: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  fontTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  fontName: {
    textAlign: 'center',
  },
  fontDescription: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    textAlign: 'center',
  },
  previewText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    minHeight: LAYOUT.CARD.HEIGHT.LIST_ITEM,
    textAlignVertical: 'center',
  },
});
