import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { PRESS_ANIMATION_BUTTON, usePressAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';
import { getSafeStorage } from '@/utils/safeAsyncStorage';

// iOS 26 UIBarButton has fixed 36pt glass container
// Profile fills the glass container completely
const IOS_GLASS_SIZE = 36;

interface HeaderProfileProps {
  size?: number;
}

const getFirstNameFromEmail = (email: string): string => {
  const name = email.split('@')[0];
  if (!name) return 'U';
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const getInitials = (name: string): string => {
  return name.charAt(0).toUpperCase();
};

export const HeaderProfile = memo<HeaderProfileProps>(({ size = 32 }) => {
  const colors = useColors();
  const { user } = useAuth();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const isIOS = Platform.OS === 'ios';
  // On iOS, profile fills the glass container; on Android use the provided size
  const effectiveSize = isIOS ? IOS_GLASS_SIZE : size;

  // Press animation for profile button
  const profilePressAnimation = usePressAnimation(PRESS_ANIMATION_BUTTON);

  const handlePress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT);
  }, []);

  const profilePhotoStyle = useMemo(
    () => [
      styles.baseProfilePhoto,
      { width: effectiveSize, height: effectiveSize, borderRadius: effectiveSize / 2 },
    ],
    [effectiveSize],
  );

  // Load saved profile photo
  const loadProfilePhoto = useCallback(async () => {
    if (!user?.id) return;

    try {
      const storage = getSafeStorage();
      const savedUri = await storage.getItem(`profile_photo_${user.id}`);
      if (savedUri) {
        setProfilePhotoUri(savedUri);
      } else {
        setProfilePhotoUri(null);
      }
    } catch (error) {
      handleError(error as Error, { showToast: false });
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
  const initials = getInitials(firstName);

  // iOS: Use 36pt container to match glass, Android: use content size
  const containerStyle = isIOS
    ? [styles.container, { width: IOS_GLASS_SIZE, height: IOS_GLASS_SIZE }]
    : styles.container;

  return (
    <View style={containerStyle}>
      {/* Profile Button */}
      <Pressable
        onPress={handlePress}
        onPressIn={profilePressAnimation.handlePressIn}
        onPressOut={profilePressAnimation.handlePressOut}
        style={styles.profileButton}
        hitSlop={isIOS ? undefined : { top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Animated.View style={profilePressAnimation.animatedStyle}>
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
                style={[
                  styles.baseInitialsText,
                  { fontSize: effectiveSize * 0.45, color: colors.background },
                ]}
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
  // Pre-computed base styles for better performance
  baseProfilePhoto: {
    // Width, height, and borderRadius applied dynamically
  },
  baseInitialsText: {
    // Font size and color applied dynamically
  },
});
