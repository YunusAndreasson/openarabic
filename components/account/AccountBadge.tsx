import { Ionicons } from '@/components/ui';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';

import { BaseCard } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { PRESS_ANIMATION_BUTTON } from '@/hooks/animations';
import { useProfilePhotoPicker } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
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

  // Animation values — the photo's press scale belongs to useButtonPress now.
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
        cancelAnimation(containerOpacity);
      } catch {
        // Animation cleanup failed - continue
      }
    };
  }, [containerOpacity]);

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

  // The photo used to pulse with a withSequence fired on press COMPLETION, so
  // holding a finger down showed nothing and the animation played after the
  // release. The shared engine ties the scale to finger-down/up like every
  // other control, and brings the haptic with it.
  const {
    handlePress: handlePhotoPress,
    animatedStyle: photoAnimatedStyle,
    handlePressIn,
    handlePressOut,
  } = useButtonPress({
    onPress: selectPhoto,
    hapticType: 'selection',
    animationOptions: PRESS_ANIMATION_BUTTON,
  });

  // Dynamic styles (React Compiler auto-memoizes)
  const dynamicStyles = {
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
    // The card is BaseCard's; the Animated.View outside it exists only to carry
    // the photo-load fade. This used to hand-roll the whole surface — radius,
    // overflow, elevation1 fill and a raw LAYOUT.ELEVATION.SMALL spread, which
    // skipped the theme-aware wrapper and made it one of only two cards in the
    // app still casting a shadow in dark mode.
    <Animated.View style={containerAnimatedStyle}>
      <BaseCard
        surface="elevation1"
        style={styles.profileCard}
        contentStyle={styles.profileContent}
      >
        {/* Profile Photo */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={STRINGS.ACCOUNT_A11Y_CHANGE_PHOTO}
          onPress={handlePhotoPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
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
      </BaseCard>
    </Animated.View>
  );
}

AccountBadge.displayName = 'AccountBadge';

const styles = StyleSheet.create({
  // BaseCard supplies the radius, the surface and the clipping; these are only
  // the card's outer margin and its inner padding.
  profileCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
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
