import { AppleButton } from '@invertase/react-native-apple-authentication';
import { StyleSheet, View } from 'react-native';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

export function NativeAppleSignIn({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const dark = useIsDarkMode();
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} accessibilityState={{ disabled }}>
      <AppleButton
        testID="apple-sign-in-button"
        buttonType={AppleButton.Type.SIGN_IN}
        buttonStyle={dark ? AppleButton.Style.WHITE : AppleButton.Style.BLACK}
        cornerRadius={LAYOUT.BORDER_RADIUS.MEDIUM}
        style={styles.button}
        onPress={() => {
          if (!disabled) onPress();
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({ button: { width: '100%', height: MIN_TOUCH_TARGET.LARGE } });
