import { memo, useMemo, type FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  containerStyle?: StyleProp<ViewStyle>;
  isFirstSection?: boolean;
}

const SectionTitle: FC<SectionTitleProps> = ({
  title,
  subtitle,
  containerStyle,
  isFirstSection = false,
}) => {
  const titleStyle = useMemo(
    () => ({
      marginBottom: 0,
    }),
    []
  );

  const subtitleStyle = useMemo(
    () => ({
      marginTop: LAYOUT.SPACING.TINY,
    }),
    []
  );

  return (
    <View style={[styles.container, isFirstSection && styles.firstSection, containerStyle]}>
      <View style={styles.titleGroup}>
        <ThemedText colorName="headingText" style={titleStyle} type="heading2">
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

const areEqual = (prevProps: SectionTitleProps, nextProps: SectionTitleProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.isFirstSection === nextProps.isFirstSection &&
    prevProps.containerStyle === nextProps.containerStyle
  );
};

export default memo(SectionTitle, areEqual);

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  firstSection: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
  titleGroup: {
    flex: 1,
  },
});
