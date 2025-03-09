import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Platform, ViewStyle, TextStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import { SentenceWord } from '@/types/vocabulary.types';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { ThemedModal } from './ThemedModal';
import { ThemedButton } from './ThemedButton';

interface WordDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  word: SentenceWord;
  isSelected: boolean;
  onStudyPress?: () => void;
}

function WordDetailsModalComponent({
  visible,
  onClose,
  word,
  isSelected,
  onStudyPress,
}: WordDetailsModalProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Memoize handlers to prevent unnecessary rerenders
  const handleStudyPress = useCallback(() => {
    onStudyPress?.();
  }, [onStudyPress]);

  // Memoize styles to prevent unnecessary rerenders
  const styles = useMemo(() => {
    const { width } = Dimensions.get('window');
    const maxWidth = Math.min(width * 0.9, 400);

    return StyleSheet.create({
      modalContent: {
        width: maxWidth,
        padding: 0,
        borderRadius: LAYOUT.BORDER_RADIUS.LARGE * 1.5,
        overflow: 'hidden',
        ...Platform.select({
          ios: {
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
          },
          android: {
            elevation: 12,
          },
        }),
      } as ViewStyle,
      contentWrapper: {
        width: '100%',
        gap: LAYOUT.SPACING.XLARGE,
        paddingTop: LAYOUT.SPACING.XLARGE,
        paddingBottom: LAYOUT.SPACING.XLARGE,
        paddingHorizontal: LAYOUT.SPACING.XLARGE,
      } as ViewStyle,
      header: {
        alignItems: 'center',
        width: '100%',
        gap: LAYOUT.SPACING.LARGE,
      } as ViewStyle,
      arabicWord: {
        ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.3, {
          textAlign: 'center' as const,
          paddingVertical: LAYOUT.SPACING.MEDIUM,
          textAlignVertical: 'center' as const,
        }),
      } as TextStyle,
      translation: {
        textAlign: 'center' as const,
        fontWeight: '600',
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
        paddingHorizontal: LAYOUT.SPACING.MEDIUM,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
        opacity: 0.9,
      } as TextStyle,
      detailsContainer: {
        gap: LAYOUT.SPACING.LARGE,
        width: '100%',
      } as ViewStyle,
      detailRow: {
        gap: LAYOUT.SPACING.SMALL,
        width: '100%',
        marginHorizontal: LAYOUT.SPACING.XLARGE,
      } as ViewStyle,
      label: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        fontWeight: '600',
        opacity: LAYOUT.OPACITY.DIMMED,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      } as TextStyle,
      pill: {
        borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
        padding: LAYOUT.SPACING.LARGE,
        marginHorizontal: -LAYOUT.SPACING.XLARGE,
        marginVertical: 0,
        width: 'auto',
        alignSelf: 'stretch',
        ...Platform.select({
          ios: {
            shadowColor: 'black',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
          },
          android: {
            elevation: 1,
          },
        }),
      } as ViewStyle,
      rootText: {
        ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.XXLARGE, {
          textAlign: 'center' as const,
          marginBottom: LAYOUT.SPACING.MEDIUM,
        }),
      } as TextStyle,
      rootMeaning: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        marginTop: LAYOUT.SPACING.MEDIUM,
        textAlign: 'center' as const,
        opacity: LAYOUT.OPACITY.DIMMED,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
      } as TextStyle,
      typeText: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
        textAlign: 'center' as const,
        fontWeight: '500',
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
      } as TextStyle,
      grammarNote: {
        gap: LAYOUT.SPACING.SMALL,
        width: '100%',
        marginHorizontal: LAYOUT.SPACING.XLARGE,
      } as ViewStyle,
      noteText: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
      } as TextStyle,
      studyButton: {
        alignSelf: 'center',
        minWidth: 240,
        marginTop: LAYOUT.SPACING.MEDIUM,
      } as ViewStyle,
    });
  }, []);

  // Memoize styles to prevent new object creation on each render
  const arabicWordStyle = useMemo(
    () => [
      styles.arabicWord,
      {
        color: isSelected ? colors.tint : colors.arabicText,
        fontWeight: isSelected ? ('700' as const) : ('normal' as const),
        textShadowColor: isSelected ? colors.textShadowLight : 'transparent',
        textShadowRadius: isSelected ? 0.5 : 0,
        textShadowOffset: { width: 0, height: 0 },
      } as TextStyle,
    ],
    [colors.arabicText, colors.tint, colors.textShadowLight, isSelected, styles.arabicWord]
  );

  const translationStyle = useMemo(
    () => [styles.translation, { color: colors.titleText } as TextStyle],
    [colors.titleText, styles.translation]
  );

  const labelStyle = useMemo(
    () => [styles.label, { color: colors.titleText } as TextStyle],
    [colors.titleText, styles.label]
  );

  const pillStyle = useMemo(
    () =>
      ({
        ...styles.pill,
        backgroundColor: colors.textOverlay,
        borderColor: colors.borderOverlay,
        borderWidth: LAYOUT.BORDER.WIDTH.THIN,
      }) as ViewStyle,
    [colors.textOverlay, colors.borderOverlay, styles.pill]
  );

  const rootTextStyle = useMemo(
    () => [styles.rootText, { color: colors.arabicText } as TextStyle],
    [colors.arabicText, styles.rootText]
  );

  const rootMeaningStyle = useMemo(
    () => [styles.rootMeaning, { color: colors.titleText } as TextStyle],
    [colors.titleText, styles.rootMeaning]
  );

  const typeTextStyle = useMemo(
    () => [styles.typeText, { color: colors.titleText } as TextStyle],
    [colors.titleText, styles.typeText]
  );

  const noteTextStyle = useMemo(
    () => [styles.noteText, { color: colors.titleText } as TextStyle],
    [colors.titleText, styles.noteText]
  );

  // Custom button style for selected state to ensure border is visible
  const buttonStyle = useMemo(() => {
    return {
      ...styles.studyButton,
      borderWidth: isSelected ? 1 : 0,
      borderColor: isSelected ? colors.tint : 'transparent',
    } as ViewStyle;
  }, [isSelected, colors.tint, styles.studyButton]);

  // Modal content style with dynamic background color
  const modalContentStyle = useMemo(
    (): ViewStyle =>
      ({
        ...styles.modalContent,
        backgroundColor: colors.cardBackground,
        maxHeight: '85%',
      }) as ViewStyle,
    [colors.cardBackground, styles.modalContent]
  );

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      useBlur={true}
      blurIntensity={isDarkMode ? 15 : 30}
      contentStyle={modalContentStyle}
      useHaptics={true}
      animationDuration={250}
      animationType="fade"
      showCloseButton={false}
      overlayOpacity={0.15}
    >
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <ThemedText style={arabicWordStyle} skipDefaultColor>
            {word.word_form}
          </ThemedText>
          <ThemedText style={translationStyle} skipDefaultColor numberOfLines={3}>
            {word.english}
          </ThemedText>
        </View>

        <View style={styles.detailsContainer}>
          {word.root && (
            <View style={styles.detailRow}>
              <ThemedText style={labelStyle} skipDefaultColor>
                Root
              </ThemedText>
              <View style={pillStyle}>
                <ThemedText style={rootTextStyle} skipDefaultColor>
                  {word.root.letters}
                </ThemedText>
                {word.root.meaning && (
                  <ThemedText style={rootMeaningStyle} skipDefaultColor>
                    {word.root.meaning}
                  </ThemedText>
                )}
              </View>
            </View>
          )}

          {word.word_type && (
            <View style={styles.detailRow}>
              <ThemedText style={labelStyle} skipDefaultColor>
                Type
              </ThemedText>
              <View style={pillStyle}>
                <ThemedText style={typeTextStyle} skipDefaultColor>
                  {word.word_type.name}
                </ThemedText>
              </View>
            </View>
          )}

          {word.grammar_note && (
            <View style={styles.grammarNote}>
              <ThemedText style={labelStyle} skipDefaultColor>
                Grammar Notes
              </ThemedText>
              <View style={pillStyle}>
                <ThemedText style={noteTextStyle} skipDefaultColor>
                  {word.grammar_note}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        {onStudyPress && (
          <ThemedButton
            title={isSelected ? 'Word added to study list' : 'Study this word'}
            icon={isSelected ? 'checkmark-circle' : 'school'}
            variant={isSelected ? 'outlined' : 'filled'}
            onPress={handleStudyPress}
            style={buttonStyle}
          />
        )}
      </View>
    </ThemedModal>
  );
}

// Memoize the component to prevent unnecessary rerenders
export const WordDetailsModal = React.memo(WordDetailsModalComponent);
