import { BaseCard } from '@common/BaseCard';
import Slider from '@react-native-community/slider';
import { useEffect, useState, type FC } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function FontPreviewCard({ option, isSelected, fontSize, onSelect }: FontPreviewCardProps) {
  const colors = useColors();

  const handlePress = () => {
    selectionFeedback();
    onSelect(option.name);
  };

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

  // Keep local state in sync when global value changes externally
  useEffect(() => {
    if (!isSliding && localFontSize !== selectedFontSize) {
      setLocalFontSize(selectedFontSize);
    }
  }, [selectedFontSize, localFontSize, isSliding]);

  const handleFontSizeChange = (value: number) => {
    setLocalFontSize(value);
  };

  const handleSlidingStart = () => {
    setIsSliding(true);
  };

  const handleSlidingComplete = (value: number) => {
    setIsSliding(false);
    selectionFeedback();
    setFontSize(value);
  };

  const scrollContentStyle = {
    gap: LAYOUT.SPACING.SMALL,
    paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE, // Extra space + safe area
  };

  return (
    <View style={styles.container}>
      <BaseCard shadowSize="small" style={styles.sliderCard}>
        <Slider
          style={styles.slider}
          minimumValue={fontSizeRange.MIN}
          maximumValue={fontSizeRange.MAX}
          step={fontSizeRange.STEP}
          value={localFontSize}
          onValueChange={handleFontSizeChange}
          onSlidingStart={handleSlidingStart}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={colors.tint}
          maximumTrackTintColor={colors.borderOverlay}
          thumbTintColor={colors.tint}
        />
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
            fontSize={isSliding ? localFontSize : selectedFontSize}
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
