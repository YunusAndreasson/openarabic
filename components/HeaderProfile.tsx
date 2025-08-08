import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useReadingStreak } from '@/hooks/articles/useReadingStreak';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch } from '@/store/hooks';
import { openStreakBottomSheet } from '@/store/streakSlice';
import { handleError } from '@/utils/errorHandling';
import { getSafeStorage } from '@/utils/safeAsyncStorage';
import { getFirstNameFromEmail } from '@/utils/stringUtils';

// Helper functions from AccountBadge for consistency
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0]?.charAt(0).toUpperCase() || 'U';
  }
  return (
    ((words[0]?.charAt(0) || '') + (words[words.length - 1]?.charAt(0) || '')).toUpperCase() || 'U'
  );
};

interface HeaderProfileProps {
  size?: number;
}

const HeaderProfile = memo(({ size = 28 }: HeaderProfileProps) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  // Get reading streak data
  const { streak: streakData } = useReadingStreak();
  const currentStreak = streakData?.currentStreak ?? 0;
  const hasStreak = currentStreak > 0;

  const handlePress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT);
  }, []);

  const handleStreakPress = useCallback(() => {
    dispatch(openStreakBottomSheet());
  }, [dispatch]);

  // Load saved profile photo
  useEffect(() => {
    if (!user?.id) return;

    const loadProfilePhoto = async () => {
      try {
        const storage = getSafeStorage();
        const savedUri = await storage.getItem(`profile_photo_${user.id}`);
        if (savedUri) {
          setProfilePhotoUri(savedUri);
        }
      } catch (error) {
        handleError(error as Error, { showToast: false });
      }
    };

    loadProfilePhoto();
  }, [user?.id]);

  if (!user) return null;

  const firstName = getFirstNameFromEmail(user.email || '');
  const initials = getInitials(firstName);

  return (
    <View style={styles.container}>
      {/* Streak Counter */}
      <Pressable
        style={styles.streakContainer}
        onPress={handleStreakPress}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      >
        <Ionicons name="flame" size={16} color={hasStreak ? colors.warning : colors.textTertiary} />
        <ThemedText
          type="caption"
          weight="semibold"
          style={[styles.streakText, { color: hasStreak ? colors.warning : colors.textTertiary }]}
        >
          {currentStreak}
        </ThemedText>
      </Pressable>

      {/* Profile Button */}
      <Pressable onPress={handlePress} style={styles.profileButton}>
        {profilePhotoUri ? (
          <Image
            source={{ uri: profilePhotoUri }}
            style={[styles.profilePhoto, { width: size, height: size, borderRadius: size / 2 }]}
            contentFit="cover"
            cachePolicy="memory-disk"
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
              style={[styles.initialsText, { fontSize: size * 0.4, color: colors.white }]}
            >
              {initials}
            </ThemedText>
          </View>
        )}
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
    gap: LAYOUT.SPACING.MEDIUM,
    paddingRight: LAYOUT.SCREEN_EDGE_PADDING, // Align with featured content padding
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    minHeight: MIN_TOUCH_TARGET.SMALL,
    justifyContent: 'center',
  },
  streakText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  profileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  profilePhoto: {
    // Dynamic styles applied inline
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    // No additional styling needed - tint background will be the only circle
  },
  initialsText: {
    // Dynamic styles applied inline
  },
});

export default HeaderProfile;
