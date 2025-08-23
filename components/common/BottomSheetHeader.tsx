import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';

interface BottomSheetHeaderProps {
  title: string;
  subtitle: string;
}

export const BottomSheetHeader = ({ title, subtitle }: BottomSheetHeaderProps) => {
  return (
    <View style={styles.header}>
      <ThemedText type="heading3" weight="bold" style={styles.mainTitle}>
        {title}
      </ThemedText>
      <ThemedText type="body" colorName="textTertiary" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    ...LAYOUT.BOTTOM_SHEET.HEADER,
    marginBottom: LAYOUT.SPACING.XLARGE, // 24px - major section separation
  },
  mainTitle: {
    marginBottom: LAYOUT.SPACING.TINY, // 4px - tight coupling with subtitle
    textAlign: 'center',
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // 15px - secondary descriptive text
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
});
