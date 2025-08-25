import Slider from '@react-native-community/slider';
import { memo, useCallback, useEffect, useState, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import {
  useArabicFontSelector,
  type ArabicFontOption,
} from '@/hooks/account/useArabicFontSelector';
import { useColors } from '@/hooks/theme/useColors';
import type { ArabicFontName } from '@/store/settingsSlice';
import { selectionFeedback } from '@/utils/haptics';

interface FontPreviewCardProps {
  option: ArabicFontOption;
  isSelected: boolean;
  fontSize: number;
  onSelect: (fontName: ArabicFontName) => void;
}

const FontPreviewCard = memo(({ option, isSelected, fontSize, onSelect }: FontPreviewCardProps) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    selectionFeedback();
    onSelect(option.name);
  }, [option.name, onSelect]);

  return (
    <BaseCard
            shadowSize="small"
      style={[
        styles.fontCard,
        {
          backgroundColor: isSelected ? colors.tintBackground : colors.card,
          borderColor: isSelected ? colors.tint : colors.borderOverlay,
          borderWidth: LAYOUT.BORDER.WIDTH.THIN,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.fontHeader}>
        <ThemedText style={styles.fontName} type="body" weight="semibold">
          {option.displayName}
        </ThemedText>
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
    </BaseCard>
  );
});

FontPreviewCard.displayName = 'FontPreviewCard';

const ArabicFontSelector: FC = () => {
  const colors = useColors();
  const { selectedFont, selectedFontSize, fontOptions, selectFont, setFontSize, fontSizeRange } =
    useArabicFontSelector();

  // Local UI state to avoid dispatching on every slider tick
  const [localFontSize, setLocalFontSize] = useState<number>(selectedFontSize);

  // Keep local state in sync when global value changes externally
  useEffect(() => {
    if (localFontSize !== selectedFontSize) {
      setLocalFontSize(selectedFontSize);
    }
  }, [selectedFontSize, localFontSize]);

  const handleFontSizeChange = useCallback((value: number) => {
    setLocalFontSize(value);
  }, []);

  const handleSlidingComplete = useCallback(
    (value: number) => {
      selectionFeedback();
      setFontSize(value);
    },
    [setFontSize]
  );

  return (
    <View style={styles.container}>
      <BaseCard  shadowSize="small" style={styles.sliderCard}>
        <Slider
          style={styles.slider}
          minimumValue={fontSizeRange.MIN}
          maximumValue={fontSizeRange.MAX}
          step={fontSizeRange.STEP}
          value={localFontSize}
          onValueChange={handleFontSizeChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.borderOverlay}
          thumbTintColor={colors.tint}
        />
      </BaseCard>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {fontOptions.map(option => (
          <FontPreviewCard
            key={option.name}
            isSelected={selectedFont === option.name}
            fontSize={localFontSize}
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
  slider: {
    width: '100%',
    height: LAYOUT.BUTTON.HEIGHT.LARGE - LAYOUT.SPACING.SMALL,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
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
  fontName: {
    textAlign: 'center',
  },
  fontDescription: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
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

export default ArabicFontSelector;
