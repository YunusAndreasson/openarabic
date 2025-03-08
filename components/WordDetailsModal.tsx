import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Platform, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
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
        borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE * 1.5,
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
      },
      contentWrapper: {
        width: '100%',
        gap: LAYOUT.SPACING.XLARGE,
        paddingTop: LAYOUT.SPACING.XLARGE,
        paddingBottom: LAYOUT.SPACING.XLARGE,
        paddingHorizontal: LAYOUT.SPACING.XLARGE,
      },
      header: {
        alignItems: 'center',
        width: '100%',
        gap: LAYOUT.SPACING.LARGE,
      },
      arabicWord: {
        ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.3, {
          textAlign: 'center',
          paddingVertical: LAYOUT.SPACING.MEDIUM,
          textAlignVertical: 'center',
        }),
      },
      translation: {
        textAlign: 'center',
        fontWeight: '600',
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
        paddingHorizontal: LAYOUT.SPACING.MEDIUM,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
        opacity: 0.9,
      },
      detailsContainer: {
        gap: LAYOUT.SPACING.LARGE,
        width: '100%',
      },
      detailRow: {
        gap: LAYOUT.SPACING.SMALL,
        width: '100%',
        marginHorizontal: LAYOUT.SPACING.XLARGE,
      },
      label: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        fontWeight: '600',
        opacity: LAYOUT.OPACITY.DIMMED,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      },
      pill: {
        borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
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
      },
      rootText: {
        ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.XXLARGE, {
          textAlign: 'center',
          marginBottom: LAYOUT.SPACING.MEDIUM,
        }),
      },
      rootMeaning: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        marginTop: LAYOUT.SPACING.MEDIUM,
        textAlign: 'center',
        opacity: LAYOUT.OPACITY.DIMMED,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
      },
      typeText: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
      },
      grammarNote: {
        gap: LAYOUT.SPACING.SMALL,
        width: '100%',
        marginHorizontal: LAYOUT.SPACING.XLARGE,
      },
      noteText: {
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.6,
      },
      studyButton: {
        alignSelf: 'center',
        minWidth: 240,
        marginTop: LAYOUT.SPACING.MEDIUM,
      },
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
      },
    ],
    [colors.arabicText, colors.tint, colors.textShadowLight, isSelected]
  );

  const translationStyle = useMemo(
    () => [styles.translation, { color: colors.titleText }],
    [colors.titleText]
  );

  const labelStyle = useMemo(() => [styles.label, { color: colors.titleText }], [colors.titleText]);

  const pillStyle = useMemo(
    () => ({
      ...styles.pill,
      backgroundColor: colors.textOverlay,
      borderColor: colors.borderOverlay,
      borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    }),
    [colors.textOverlay, colors.borderOverlay]
  );

  const rootTextStyle = useMemo(
    () => [styles.rootText, { color: colors.arabicText }],
    [colors.arabicText]
  );

  const rootMeaningStyle = useMemo(
    () => [styles.rootMeaning, { color: colors.titleText }],
    [colors.titleText]
  );

  const typeTextStyle = useMemo(
    () => [styles.typeText, { color: colors.titleText }],
    [colors.titleText]
  );

  const noteTextStyle = useMemo(
    () => [styles.noteText, { color: colors.titleText }],
    [colors.titleText]
  );

  // Custom button style for selected state to ensure border is visible
  const buttonStyle = useMemo(() => {
    return {
      ...styles.studyButton,
      borderWidth: isSelected ? 1 : 0,
      borderColor: isSelected ? colors.tint : 'transparent',
    };
  }, [isSelected, colors.tint]);

  // Modal content style with dynamic background color
  const modalContentStyle = useMemo(
    (): ViewStyle => ({
      ...styles.modalContent,
      backgroundColor: colors.cardBackground,
      maxHeight: '85%',
    }),
    [colors.cardBackground]
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
