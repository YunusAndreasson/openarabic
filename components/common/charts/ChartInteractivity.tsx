import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { PRESS_ANIMATION_CARD } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import { withAlpha } from '@/utils/colorUtils';

interface ChartTooltip {
  x: number;
  y: number;
  value: string;
  label: string;
  visible: boolean;
}

interface ChartTooltipProps {
  tooltip: ChartTooltip;
  maxWidth: number;
}

export const ChartTooltipData = memo<ChartTooltipProps>(({ tooltip, maxWidth }) => {
  const colors = useColors();

  if (!tooltip.visible) return null;

  return (
    <View
      style={[
        styles.tooltip,
        {
          left: Math.max(8, Math.min(tooltip.x - 40, maxWidth - 88)),
          top: Math.max(8, tooltip.y),
          backgroundColor: colors.elevation3,
          borderColor: colors.wordTooltipBorder, // Distinct from elevation3 bg (border === elevation3 in dark mode)
          shadowColor: colors.shadow,
        },
      ]}
    >
      <ThemedText colorName="text" style={styles.tooltipValue}>
        {tooltip.value}
      </ThemedText>
      <ThemedText colorName="secondaryText" style={styles.tooltipLabel}>
        {tooltip.label}
      </ThemedText>
    </View>
  );
});

ChartTooltipData.displayName = 'ChartTooltip';

interface DataPointOverlayProps {
  x: number;
  y: number;
  value: string;
  label: string;
  onPress: (x: number, y: number, value: string, label: string) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const DataPointOverlay = memo<DataPointOverlayProps>(({ x, y, value, label, onPress }) => {
  const [isPressed, setIsPressed] = useState(false);
  const colors = useColors();

  // The animation used to be dead: this component pulled `animatedStyle` off
  // usePressAnimation but wired its own same-named press handlers, which set
  // `isPressed` and never touched the hook's shared value — so the worklet
  // returned a constant scale of 1 on every press. Composing the hook's
  // handlers with the state setter drives both.
  const {
    handlePress,
    animatedStyle,
    handlePressIn: animatePressIn,
    handlePressOut: animatePressOut,
  } = useButtonPress({
    onPress: useCallback(() => {
      // Defensive guards to avoid updating frozen state with invalid values
      const isValidNumber = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
      const isValidString = (s: unknown) => typeof s === 'string' && s.length > 0;

      if (
        !isValidNumber(x) ||
        !isValidNumber(y) ||
        !isValidString(value) ||
        !isValidString(label)
      ) {
        return;
      }

      onPress(x, y, value, label);
    }, [x, y, value, label, onPress]),
    animationOptions: PRESS_ANIMATION_CARD,
  });

  // `isPressed` earns its renders — it paints the tint ring below.
  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    animatePressIn();
  }, [animatePressIn]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    animatePressOut();
  }, [animatePressOut]);

  const touchTargetSize = MIN_TOUCH_TARGET.LARGE;
  const offset = touchTargetSize / 2;

  const touchableStyle = useMemo(
    () => [
      styles.touchable,
      {
        left: x - offset,
        top: y - offset,
        width: touchTargetSize,
        height: touchTargetSize,
        borderRadius: touchTargetSize / 2,
        backgroundColor: isPressed
          ? withAlpha(colors.tint, LAYOUT.OPACITY.FAINT)
          : colors.transparent,
        borderWidth: isPressed ? LAYOUT.BORDER.WIDTH.FOCUSED : 0,
        borderColor: isPressed ? colors.tint : colors.transparent,
      },
    ],
    [x, y, offset, touchTargetSize, isPressed, colors.tint, colors.transparent],
  );

  return (
    <AnimatedPressable
      style={[touchableStyle, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
});

DataPointOverlay.displayName = 'DataPointOverlay';

export const useChartTooltip = () => {
  const [tooltip, setTooltip] = useState<ChartTooltip>({
    x: 0,
    y: 0,
    value: '',
    label: '',
    visible: false,
  });

  // Jakob's Law: Analytics apps keep tooltips visible until user interaction changes

  const showTooltip = useCallback(
    (x: number, y: number, value: string, label: string, yOffset: number = -40) => {
      setTooltip({
        x,
        y: y + yOffset,
        value,
        label,
        visible: true,
      });
    },
    [],
  );

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    tooltip,
    showTooltip,
    hideTooltip,
  };
};

const styles = StyleSheet.create({
  tooltip: {
    ...LAYOUT.ELEVATION.SUBTLE,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    padding: LAYOUT.SPACING.SMALL,
    position: 'absolute',
  },
  touchable: {
    position: 'absolute',
  },
  tooltipLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  tooltipValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontFamily: FONTS.ENGLISH_BOLD,
  },
});
