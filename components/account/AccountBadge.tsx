import { Ionicons } from '@/components/ui';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
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
const formatMemberSince = (createdAt?: string): string | null => {
  if (!createdAt) return null;
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

export function AccountBadge({ userEmail, userId, createdAt }: AccountBadgeProps) {
  const colors = useColors();

  // Animation values
  const scaleValue = useSharedValue(1);
  const containerOpacity = useSharedValue(0);
  const [photoLoaded, setPhotoLoaded] = useState(false);

  // Profile photo picker with local storage persistence
  const { profilePhotoUri, selectPhoto } = useProfilePhotoPicker({
    userId,
    onPhotoLoaded: () => setPhotoLoaded(true),
  });

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      try {
        cancelAnimation(scaleValue);
        cancelAnimation(containerOpacity);
        scaleValue.value = 1;
      } catch {
        // Animation cleanup failed - continue
      }
    };
  }, [scaleValue, containerOpacity]);

  // Container opacity — fade in when photo loaded
  useEffect(() => {
    if (photoLoaded) {
      // Reanimated shared values are intentionally mutable across effects.
      // eslint-disable-next-line react-hooks/immutability
      containerOpacity.value = withTiming(1, TIMING_CONFIG.ENTRANCE);
    }
  }, [photoLoaded, containerOpacity]);

  // Reanimated 4: pass shared value directly (no useAnimatedStyle wrapper needed)
  const containerAnimatedStyle = { opacity: containerOpacity };

  // Derived values
  const firstName = getFirstNameFromEmail(userEmail);
  const memberSince = formatMemberSince(createdAt);
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

  // Reanimated 4: pass shared value directly (no useAnimatedStyle wrapper needed)
  const photoAnimatedStyle = { transform: [{ scale: scaleValue }] };

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
    <Animated.View style={[styles.profileCard, dynamicStyles.profileCard, containerAnimatedStyle]}>
      <View style={styles.profileContent}>
        {/* Profile Photo */}
        <Pressable
          onPress={handlePhotoPress}
          style={styles.photoContainer}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
        >
          <Animated.View style={photoAnimatedStyle}>
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
          <ThemedText type="heading2" style={styles.userName} numberOfLines={1}>
            {firstName}
          </ThemedText>
          {memberSince && (
            <ThemedText
              type="body"
              colorName="secondaryText"
              style={styles.memberSince}
              numberOfLines={1}
            >
              {memberSince}
            </ThemedText>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

AccountBadge.displayName = 'AccountBadge';

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    overflow: 'hidden',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
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
