import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { usePressAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';
import { getSafeStorage } from '@/utils/safeAsyncStorage';

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

  // Press animation for profile button
  const profilePressAnimation = usePressAnimation({ type: 'button' });

  const handlePress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT);
  }, []);

  const profilePhotoStyle = useMemo(
    () => [styles.baseProfilePhoto, { width: size, height: size, borderRadius: size / 2 }],
    [size],
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

  return (
    <View style={styles.container}>
      {/* Profile Button */}
      <Pressable
        onPress={handlePress}
        onPressIn={profilePressAnimation.handlePressIn}
        onPressOut={profilePressAnimation.handlePressOut}
        style={styles.profileButton}
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
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
              ]}
            >
              <ThemedText
                type="label"
                weight="bold"
                style={[
                  styles.baseInitialsText,
                  { fontSize: size * 0.45, color: colors.background },
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
  profilePhoto: {
    // Base style - dynamic properties applied inline
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
