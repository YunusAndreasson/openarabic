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
      <ThemedText type="heading3" weight="bold" style={styles.title}>
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
  title: LAYOUT.BOTTOM_SHEET.STYLES.title,
  subtitle: LAYOUT.BOTTOM_SHEET.STYLES.subtitle,
});
