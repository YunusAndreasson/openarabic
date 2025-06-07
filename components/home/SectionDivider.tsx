import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

const SectionDivider = (): JSX.Element => {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING * 2,
  },
  line: {
    height: 1,
    opacity: 0.3,
    width: '100%',
  },
});

export default SectionDivider;
