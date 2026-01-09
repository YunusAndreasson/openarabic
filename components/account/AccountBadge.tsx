import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { useProfilePhotoPicker } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
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

export function AccountBadge({ userEmail, userId, createdAt }: AccountBadgeProps) {
  const colors = useColors();

  // Animation values
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(0);

  // Profile photo picker with local storage persistence
  const { profilePhotoUri, selectPhoto } = useProfilePhotoPicker({
    userId,
    onPhotoLoaded: useCallback(() => {
      // Animate in after loading (cancel any existing animation first)
      cancelAnimation(opacityValue);
      opacityValue.set(withTiming(1, TIMING_CONFIG.ENTRANCE));
    }, [opacityValue]),
  });

  // Cleanup animations on unmount
  React.useEffect(() => {
    return () => {
      try {
        cancelAnimation(scaleValue);
        cancelAnimation(opacityValue);
        // Reset to default values (use .value in cleanup for reliability)
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

  // Handle photo press animation
  const handlePhotoPress = useCallback(() => {
    cancelAnimation(scaleValue);
    scaleValue.set(
      withSequence(
        withSpring(PRESS_SCALE.BUTTON, SPRING_CONFIG.BUTTON),
        withSpring(1, SPRING_CONFIG.BUTTON),
      ),
    );
    selectPhoto();
  }, [scaleValue, selectPhoto]);

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityValue.get(),
  }));

  const photoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.get() }],
  }));

  // Dynamic styles (React Compiler auto-memoizes)
  const dynamicStyles = {
    profileCard: {
      backgroundColor: colors.elevation1,
      ...LAYOUT.ELEVATION.SMALL,
      shadowColor: colors.shadow, // Override elevation shadowColor with theme color
    },
    photoRing: {
      width: PROFILE_PHOTO_SIZE + 4,
      height: PROFILE_PHOTO_SIZE + 4,
      borderRadius: (PROFILE_PHOTO_SIZE + 4) / 2,
      borderWidth: LAYOUT.BORDER.WIDTH.FOCUSED,
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
      bottom: 0,
      right: 0,
      width: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
      height: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
      borderRadius: LAYOUT.BUTTON.ICON_SIZE.MEDIUM / 2,
      backgroundColor: colors.tint,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: LAYOUT.BORDER.WIDTH.FOCUSED,
      borderColor: colors.background,
    },
    initialsText: { color: colors.background },
  };

  return (
    <>
      <Animated.View
        style={[styles.profileCard, dynamicStyles.profileCard, containerAnimatedStyle]}
      >
        <View style={styles.profileContent}>
          {/* Profile Photo */}
          <Pressable
            onPress={handlePhotoPress}
            style={styles.photoContainer}
            hitSlop={LAYOUT.HIT_SLOP.SMALL}
          >
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
                  <Ionicons name="camera" size={14} color={colors.background} />
                </View>
              </View>
            </Animated.View>
          </Pressable>

          {/* User Info */}
          <View style={styles.userInfo}>
            <ThemedText type="heading2" weight="bold" style={styles.userName} numberOfLines={1}>
              {firstName}
            </ThemedText>
            <ThemedText
              type="body"
              variant="secondary"
              style={styles.memberSince}
              numberOfLines={1}
            >
              {memberSince}
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LINE_HEIGHT_MULTIPLIERS.NORMAL,
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
