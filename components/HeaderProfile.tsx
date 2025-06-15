import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_TARGET, LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';

interface HeaderProfileProps {
  size?: number;
}

const HeaderProfile = memo(({ size = 28 }: HeaderProfileProps) => {
  const colors = useColors();
  const { user } = useAuth();

  const handlePress = useCallback(() => {
    router.push('/(tabs)/read/account');
  }, [router]);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.profileButton}>
        <Ionicons name="person" size={size * 0.8} color={colors.tint} />
      </Pressable>
    </View>
  );
});

HeaderProfile.displayName = 'HeaderProfile';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.TINY,
  },
});

export default HeaderProfile;
