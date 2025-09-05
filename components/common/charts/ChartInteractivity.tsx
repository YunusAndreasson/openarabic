import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

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
          backgroundColor: colors.elevation3, // Use elevation3 for floating chart tooltips
          borderColor: colors.border,
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

export const DataPointOverlay = memo<DataPointOverlayProps>(({ x, y, value, label, onPress }) => {
  const [isPressed, setIsPressed] = useState(false);
  const colors = useColors();

  const handlePress = useCallback(() => {
    selectionFeedback(); // Selection haptic feedback
    onPress(x, y, value, label);
  }, [x, y, value, label, onPress]);

  const handlePressIn = useCallback(() => {
    setIsPressed(true);
  }, []);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
  }, []);

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
        backgroundColor: isPressed ? colors.tint + '20' : colors.transparent,
        borderWidth: isPressed ? 2 : 0,
        borderColor: isPressed ? colors.tint : colors.transparent,
      },
    ],
    [x, y, offset, touchTargetSize, isPressed, colors.tint, colors.transparent]
  );

  return (
    <TouchableOpacity
      style={touchableStyle}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={LAYOUT.OPACITY.PRESSED}
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
    []
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
    borderRadius: LAYOUT.INPUT.BORDER_RADIUS,
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
    fontWeight: 'bold',
  },
});
