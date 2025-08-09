import type { ViewabilityConfig } from 'react-native';

export function createViewabilityConfig(): ViewabilityConfig {
  return {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  };
}

export function overrideFixedHeight(itemHeight: number) {
  return (layout: { span?: number; size?: number }) => {
    layout.size = itemHeight;
  };
}
