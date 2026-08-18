import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { PRESS_ANIMATION_BUTTON } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import { handleError } from '@/utils/errorHandling';
import { getFirstNameFromEmail } from '@/utils/stringUtils';
import { USER_STORAGE_KEYS } from '@/constants/storageKeys';

// iOS 26 UIBarButton has fixed 36pt glass container
// Profile fills the glass container completely
const IOS_GLASS_SIZE = 36;

// Initial-letter font scales proportionally with the avatar diameter.
// 0.45 keeps the glyph centered and visually balanced inside the circle
// for both the iOS (36) and Android (32) sizes.
const INITIAL_FONT_SIZE_RATIO = 0.45;

interface HeaderProfileProps {
  size?: number;
}

export const HeaderProfile = memo<HeaderProfileProps>(({ size = 32 }) => {
  const colors = useColors();
  const { user } = useAuth();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const isIOS = Platform.OS === 'ios';
  // On iOS, profile fills the glass container; on Android use the provided size
  const effectiveSize = isIOS ? IOS_GLASS_SIZE : size;

  // The shared engine, not a bare usePressAnimation: wiring the animation by
  // hand meant this button silently shipped without the haptic and the Android
  // ripple every other control in the app gets.
  const { handlePress, animatedStyle, handlePressIn, handlePressOut, rippleConfig } =
    useButtonPress({
      onPress: useCallback(() => {
        router.push(ROUTE_PATHS.ACCOUNT);
      }, []),
      hapticType: 'selection',
      animationOptions: PRESS_ANIMATION_BUTTON,
    });

  const profilePhotoStyle = useMemo(
    () => ({ width: effectiveSize, height: effectiveSize, borderRadius: effectiveSize / 2 }),
    [effectiveSize],
  );

  // Load saved profile photo
  const loadProfilePhoto = useCallback(async () => {
    if (!user?.id) return;

    try {
      const savedUri = await AsyncStorage.getItem(USER_STORAGE_KEYS.profilePhoto(user.id));
      if (savedUri) {
        setProfilePhotoUri(savedUri);
      } else {
        setProfilePhotoUri(null);
      }
    } catch (error) {
      handleError(error, { showToast: false });
    }
  }, [user?.id]);

  // Load on mount
  useEffect(() => {
    loadProfilePhoto();
  }, [loadProfilePhoto]);

  // Reload when screen comes into focus (e.g., after updating profile picture)
  useFocusEffect(
    useCallback(() => {
      loadProfilePhoto();
    }, [loadProfilePhoto]),
  );

  if (!user) return null;

  const firstName = getFirstNameFromEmail(user.email || '');
  const initials = firstName.charAt(0).toUpperCase();

  // iOS: Use 36pt container to match glass, Android: use content size
  const containerStyle = isIOS
    ? [styles.container, { width: IOS_GLASS_SIZE, height: IOS_GLASS_SIZE }]
    : styles.container;

  return (
    <View style={containerStyle}>
      {/* Profile Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={STRINGS.ACCOUNT_A11Y_OPEN}
        android_ripple={rippleConfig}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.profileButton}
        hitSlop={isIOS ? undefined : LAYOUT.HIT_SLOP.MEDIUM}
      >
        <Animated.View style={animatedStyle}>
          {profilePhotoUri ? (
            <Image
              source={{ uri: profilePhotoUri }}
              style={profilePhotoStyle}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              priority="high"
            />
          ) : (
            <View
              style={[
                styles.initialsContainer,
                {
                  backgroundColor: colors.tint,
                  width: effectiveSize,
                  height: effectiveSize,
                  borderRadius: effectiveSize / 2,
                },
              ]}
            >
              <ThemedText
                type="label"
                weight="bold"
                style={{
                  fontSize: effectiveSize * INITIAL_FONT_SIZE_RATIO,
                  color: colors.background,
                }}
              >
                {initials}
              </ThemedText>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
});

HeaderProfile.displayName = 'HeaderProfile';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
