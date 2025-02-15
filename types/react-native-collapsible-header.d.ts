declare module 'react-native-collapsible-header' {
  import { ReactNode } from 'react';
  import { ViewStyle, ScrollViewProps } from 'react-native';

  interface CollapsibleHeaderScrollViewProps extends ScrollViewProps {
    headerHeight: number;
    header: ReactNode;
    headerContainerBackgroundColor?: string;
    contentContainerStyle?: ViewStyle;
  }

  export const CollapsibleHeaderScrollView: React.FC<CollapsibleHeaderScrollViewProps>;
}
