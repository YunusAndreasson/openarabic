import { View, type ViewProps } from 'react-native';
import { useAppSelector } from '../store/hooks';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const { isDark, colors } = useAppSelector(state => state.theme);
  const backgroundColor = isDark ? darkColor || colors.background : lightColor || colors.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
