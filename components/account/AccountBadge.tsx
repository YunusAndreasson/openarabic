'use no memo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { PRESS_SCALE, SPRING_CONFIG, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { getSafeStorage } from '@/utils/safeAsyncStorage';
import { getFirstNameFromEmail } from '@/utils/stringUtils';

// Static constants for performance
const PROFILE_PHOTO_SIZE = 64;

interface AccountBadgeProps {
  userEmail: string;
  userId: string;
  createdAt?: string;
}

// Helper function to format member since date
const formatMemberSince = (createdAt: string): string => {
  const date = new Date(createdAt);
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  });
  return `Member since ${formatter.format(date)}`;
};

// Helper function to get initials for fallback
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Simple fallback for member since date - we'll use a reasonable default
const getMemberSinceDate = (createdAt?: string) => {
  // Use actual user creation date if available, otherwise use a reasonable default
  return createdAt || '2024-01-01T00:00:00.000Z';
};

const AccountBadge: React.FC<AccountBadgeProps> = memo(({ userEmail, userId, createdAt }) => {
  const colors = useColors();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  // Animation values
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(0);

  // Cleanup animations on unmount
  React.useEffect(() => {
    return () => {
      try {
        cancelAnimation(scaleValue);
        cancelAnimation(opacityValue);
        // Reset to default values
        scaleValue.value = 1;
        opacityValue.value = 0;
      } catch {
        // Animation cleanup failed - continue
      }
    };
  }, [scaleValue, opacityValue]);

  // Derived values
  const firstName = getFirstNameFromEmail(userEmail);
  const memberSince = formatMemberSince(getMemberSinceDate(createdAt));
  const initials = getInitials(firstName);
  const storageKey = `profile_photo_${userId}`;

  // Load saved profile photo on mount
  useEffect(() => {
    const loadProfilePhoto = async () => {
      try {
        const storage = getSafeStorage();
        const savedUri = await storage.getItem(storageKey);
        if (savedUri) {
          setProfilePhotoUri(savedUri);
        }
      } catch (error) {
        handleError(error as Error, { showToast: false });
      } finally {
        // Animate in after loading (cancel any existing animation first)
        cancelAnimation(opacityValue);
        opacityValue.value = withTiming(1, TIMING_CONFIG.ENTRANCE);
      }
    };

    loadProfilePhoto();
  }, [userId, storageKey, opacityValue]);

  // Handle photo selection
  const handlePhotoSelect = useCallback(async () => {
    try {
      // Request permissions - this will show the system permission dialog
      const { status, canAskAgain, granted } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!granted || status !== 'granted') {
        // If we can ask again, prompt once more to surface the system dialog
        if (canAskAgain) {
          const retry = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (retry.status !== 'granted') {
            Alert.alert(
              'Permission Required',
              'We need photo library permission to select a profile photo.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings(),
                },
              ]
            );
            return;
          }
        } else {
          // Cannot ask again: guide user to settings
          Alert.alert(
            'Permission Required',
            'Photo library access is disabled. Please enable it in system settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedUri = result.assets[0].uri;

        // Save to local storage
        const storage = getSafeStorage();
        await storage.setItem(storageKey, selectedUri);

        // Update state
        setProfilePhotoUri(selectedUri);

        // Success feedback after selection completed
        // Using selection-like subtle feedback is fine here, but we keep a single call
        // Consider mediumFeedback in future if we want stronger confirmation
        // Use selection feedback for subtle action
        selectionFeedback();
      }
    } catch (error) {
      handleError(error as Error, {
        toastMessage: 'Failed to select profile photo',
        showToast: true,
      });
    }
  }, [storageKey]);

  // Handle photo press animation
  const handlePhotoPress = useCallback(() => {
    cancelAnimation(scaleValue);
    scaleValue.value = withSequence(
      withSpring(PRESS_SCALE.BUTTON, SPRING_CONFIG.BUTTON),
      withSpring(1, SPRING_CONFIG.BUTTON)
    );
    handlePhotoSelect();
  }, [scaleValue, handlePhotoSelect]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityValue.value,
  }));

  const photoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  // Memoized styles
  const dynamicStyles = useMemo(
    () => ({
      profileCard: {
        backgroundColor: colors.elevation1,
        shadowColor: colors.shadow,
        ...LAYOUT.ELEVATION.SMALL,
      },
      photoRing: {
        width: PROFILE_PHOTO_SIZE + 4,
        height: PROFILE_PHOTO_SIZE + 4,
        borderRadius: (PROFILE_PHOTO_SIZE + 4) / 2,
        borderWidth: LAYOUT.BORDER.WIDTH.THICK,
        borderColor: colors.tint,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        position: 'relative' as const,
      },
      initialsContainer: {
        width: PROFILE_PHOTO_SIZE,
        height: PROFILE_PHOTO_SIZE,
        borderRadius: PROFILE_PHOTO_SIZE / 2,
        backgroundColor: colors.tint,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      editIconContainer: {
        position: 'absolute' as const,
        bottom: -2,
        right: -2,
        width: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
        height: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
        borderRadius: LAYOUT.BUTTON.ICON_SIZE.MEDIUM / 2,
        backgroundColor: colors.tint,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        borderWidth: LAYOUT.BORDER.WIDTH.THICK,
        borderColor: colors.background,
      },
      initialsText: { color: colors.background },
    }),
    [colors]
  );

  return (
    <Animated.View style={[styles.profileCard, dynamicStyles.profileCard, containerAnimatedStyle]}>
      <View style={styles.profileContent}>
        {/* Profile Photo */}
        <Pressable onPress={handlePhotoPress} style={styles.photoContainer}>
          <Animated.View style={[styles.photoWrapper, photoAnimatedStyle]}>
            <View style={dynamicStyles.photoRing}>
              {profilePhotoUri ? (
                <Image
                  source={{ uri: profilePhotoUri }}
                  style={styles.profilePhoto}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                  priority="high"
                />
              ) : (
                <View style={dynamicStyles.initialsContainer}>
                  <ThemedText
                    type="heading2"
                    weight="bold"
                    // Use dark text to be legible on elevation background in dark mode
                    style={[styles.initialsText, dynamicStyles.initialsText]}
                  >
                    {initials}
                  </ThemedText>
                </View>
              )}

              {/* Edit Icon Overlay */}
              <View style={dynamicStyles.editIconContainer}>
                <Ionicons name="camera" size={12} color={colors.background} />
              </View>
            </View>
          </Animated.View>
        </Pressable>

        {/* User Info */}
        <View style={styles.userInfo}>
          <ThemedText type="heading2" weight="bold" style={styles.userName} numberOfLines={1}>
            {firstName}
          </ThemedText>
          <ThemedText type="body" variant="secondary" style={styles.memberSince} numberOfLines={1}>
            {memberSince}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
});

AccountBadge.displayName = 'AccountBadge';

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  photoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: PROFILE_PHOTO_SIZE,
    height: PROFILE_PHOTO_SIZE,
    borderRadius: PROFILE_PHOTO_SIZE / 2,
  },
  initialsText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
    height: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
    borderRadius: LAYOUT.BUTTON.ICON_SIZE.MEDIUM / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  memberSince: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
});

export default AccountBadge;
