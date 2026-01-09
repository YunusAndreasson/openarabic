import { useMemo, type FC } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const SectionTitle: FC<SectionTitleProps> = ({
  title,
  subtitle,
  containerStyle,
  textStyle,
}) => {
  const titleStyle = useMemo(
    () => ({
      marginBottom: 0,
      ...(textStyle as TextStyle),
    }),
    [textStyle],
  );

  const subtitleStyle = useMemo(
    () => ({
      marginTop: LAYOUT.SPACING.TINY,
    }),
    [],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.titleGroup}>
        <ThemedText colorName="headingText" style={titleStyle} type="heading3">
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText variant="secondary" style={subtitleStyle} type="body">
            {subtitle}
          </ThemedText>
        )}
      </View>
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.LARGE,
  },
  titleGroup: {
    flex: 1,
  },
});
