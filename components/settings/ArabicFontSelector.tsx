import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { memo, useCallback, type FC } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';

import BaseCard from '@/components/BaseCard';
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
      includePressAnimation={true}
      shadowSize="small"
      style={[
        styles.fontCard,
        {
          backgroundColor: isSelected ? colors.elevation2 : colors.elevation1,
          borderColor: isSelected ? colors.tint : colors.cardBorder,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={handlePress}
    >
      {/* Header with font name and selection indicator */}
      <View style={styles.cardHeader}>
        <ThemedText style={styles.fontName} type="body" weight="semibold">
          {option.displayName}
        </ThemedText>
        {isSelected && <Ionicons color={colors.tint} name="checkmark-circle" size={20} />}
      </View>

      {/* Large Arabic preview - uses current font size */}
      <ThemedText
        colorName="arabicText"
        style={[styles.previewText, { fontFamily: option.name, fontSize }]}
        type="arabic"
      >
        {option.previewText}
      </ThemedText>

      {/* Single descriptive word */}
      <ThemedText colorName="textTertiary" style={styles.descriptionText} type="caption">
        {option.description}
      </ThemedText>
    </BaseCard>
  );
});

FontPreviewCard.displayName = 'FontPreviewCard';

const ArabicFontSelector: FC = () => {
  const colors = useColors();
  const { selectedFont, selectedFontSize, fontOptions, selectFont, setFontSize, fontSizeRange } =
    useArabicFontSelector();

  const handleFontSizeChange = useCallback(
    (value: number) => {
      setFontSize(value);
    },
    [setFontSize]
  );

  const handleSlidingComplete = useCallback(
    (value: number) => {
      // Provide haptic feedback when user finishes adjusting slider
      selectionFeedback();
      setFontSize(value);
    },
    [setFontSize]
  );

  return (
    <View style={styles.container}>
      <ThemedText colorName="textTertiary" style={styles.subtitle} type="caption">
        Tap to preview and select
      </ThemedText>

      {/* Font Size Slider Section */}
      <BaseCard includePressAnimation={false} shadowSize="small" style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <ThemedText style={styles.sliderTitle} type="body" weight="semibold">
            Font Size
          </ThemedText>
          <ThemedText colorName="textTertiary" style={styles.sizeValue} type="caption">
            {selectedFontSize}px
          </ThemedText>
        </View>

        <View style={styles.sliderContainer}>
          <View style={styles.sliderLabels}>
            <ThemedText colorName="textTertiary" style={styles.sliderLabel} type="caption">
              Small
            </ThemedText>
            <ThemedText colorName="textTertiary" style={styles.sliderLabel} type="caption">
              Large
            </ThemedText>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={fontSizeRange.MIN}
            maximumValue={fontSizeRange.MAX}
            step={fontSizeRange.STEP}
            value={selectedFontSize}
            onValueChange={handleFontSizeChange}
            onSlidingComplete={handleSlidingComplete}
            minimumTrackTintColor={colors.tint}
            maximumTrackTintColor={colors.borderOverlay}
            thumbTintColor={colors.tint}
          />
        </View>
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
            fontSize={selectedFontSize}
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

  subtitle: {
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  sliderCard: {
    padding: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  sliderTitle: {
    flex: 1,
  },

  sizeValue: {
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },

  sliderContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },

  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },

  sliderLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    opacity: 0.7,
  },

  slider: {
    width: '100%',
    height: 40,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    gap: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },

  fontCard: {
    padding: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },

  fontName: {
    flex: 1,
  },

  previewText: {
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: LAYOUT.SPACING.SMALL,
    minHeight: 80,
    textAlignVertical: 'center',
    // Dynamic line height will be calculated by getArabicTextStyle
  },

  descriptionText: {
    lineHeight: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default ArabicFontSelector;
