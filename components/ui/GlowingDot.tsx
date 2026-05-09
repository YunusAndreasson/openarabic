import { BlurMask, Canvas, Circle } from '@shopify/react-native-skia';
import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

const DOT_RADIUS = 4;
const GLOW_PADDING = 4;
const SIZE = (DOT_RADIUS + GLOW_PADDING) * 2;

interface GlowingDotProps {
  color: string;
}

/**
 * Status dot rendered through Skia so it gets a soft tinted glow halo.
 * Same visual footprint as ColorDot (8px), but reads as having depth — used
 * in surfaces like DictionaryWordCard where the dot communicates a data
 * value (memory strength) and warrants a touch of polish over a flat View.
 */
export const GlowingDot: FC<GlowingDotProps> = memo(({ color }) => {
  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={DOT_RADIUS} color={color}>
          <BlurMask blur={3} style="solid" />
        </Circle>
      </Canvas>
    </View>
  );
});

GlowingDot.displayName = 'GlowingDot';

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: SIZE,
    height: SIZE,
  },
});
