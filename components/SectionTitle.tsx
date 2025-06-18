import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, type FC } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

import { ThemedText } from './ThemedText';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  onInfoPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  isFirstSection?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const SectionTitle: FC<SectionTitleProps> = ({
  title,
  subtitle,
  onInfoPress,
  containerStyle,
  isFirstSection = false,
}) => {
  const colors = useColors();
  const scale = useSharedValue(1);

  const titleStyle = useMemo(
    () => ({
      marginBottom: 0,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.lineHeightMultiplier,
    }),
    []
  );

  const subtitleStyle = useMemo(
    () => ({
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
      marginTop: LAYOUT.SPACING.TINY,
      opacity: LAYOUT.OPACITY.HIGH,
    }),
    []
  );

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    selectionFeedback();
    onInfoPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const infoButtonStyle = useMemo(
    () => ({
      backgroundColor: colors.tintBackground,
      borderColor: colors.borderOverlay,
    }),
    [colors]
  );

  return (
    <View style={[styles.container, isFirstSection && styles.firstSection, containerStyle]}>
      <View style={styles.titleGroup}>
        <ThemedText colorName="headingText" style={titleStyle} type="heading2">
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText colorName="subtitleText" style={subtitleStyle} type="caption">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {onInfoPress && (
        <AnimatedTouchableOpacity
          style={[styles.infoIcon, infoButtonStyle, animatedStyle]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={LAYOUT.OPACITY.PRESSED}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Ionicons
            name="information-outline"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.tint}
          />
        </AnimatedTouchableOpacity>
      )}
    </View>
  );
};

SectionTitle.displayName = 'SectionTitle';

const areEqual = (prevProps: SectionTitleProps, nextProps: SectionTitleProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.onInfoPress === nextProps.onInfoPress &&
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
    marginBottom: LAYOUT.SPACING.SECTION_INTERNAL,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  firstSection: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
  infoIcon: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    height: LAYOUT.BUTTON.ICON_SIZE.SMALL + LAYOUT.SPACING.SMALL * 2,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
    width: LAYOUT.BUTTON.ICON_SIZE.SMALL + LAYOUT.SPACING.SMALL * 2,
  },
  titleGroup: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
});
