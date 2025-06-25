import { Ionicons } from '@expo/vector-icons';
import React, { memo, type FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface ThemeSelectorProps {
  /**
   * Current theme selection display text
   */
  currentThemeText: string;

  /**
   * Function to open the theme selector
   */
  onPress: () => void;
}

const ThemeSelector: FC<ThemeSelectorProps> = ({ currentThemeText, onPress }) => {
  const colors = useColors();

  return (
    <Pressable onPress={onPress} style={styles.selector}>
      <ThemedText type="body" variant="secondary">
        {currentThemeText}
      </ThemedText>
      <Ionicons
        name="chevron-forward"
        size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
        color={colors.textTertiary}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
});

ThemeSelector.displayName = 'ThemeSelector';

export default memo(ThemeSelector);
