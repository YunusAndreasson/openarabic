import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useStreaks } from '@/contexts/StreaksContext';
import { useReadingStreak } from '@/hooks/articles/useReadingStreak';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
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
  const isDarkMode = useIsDarkMode();
  const { user } = useAuth();
  const { streak: streakData } = useReadingStreak();
  const { openStreaks } = useStreaks();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const currentStreak = streakData?.currentStreak ?? 0;
  const hasStreak = currentStreak > 0;

  const handlePress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT);
  }, []);

  const handleStreakPress = useCallback(() => {
    openStreaks();
  }, [openStreaks]);

  const profilePhotoStyle = useMemo(
    () => [styles.profilePhoto, { width: size, height: size, borderRadius: size / 2 }],
    [size]
  );

  // Dynamic styles for streak badge circle - smaller and proportional to account badge
  const STREAK_BADGE_SIZE = 32; // Smaller than account badge (64px) for visual hierarchy
  const streakBadgeStyle = useMemo(
    () => ({
      width: STREAK_BADGE_SIZE,
      height: STREAK_BADGE_SIZE,
      borderRadius: STREAK_BADGE_SIZE / 2,
      borderWidth: LAYOUT.BORDER.WIDTH.THIN, // Thinner border for smaller size
      borderColor: hasStreak ? colors.warning : colors.textTertiary,
      backgroundColor: hasStreak ? colors.warning + '20' : colors.elevation1, // Slightly more opaque
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    }),
    [hasStreak, colors.warning, colors.textTertiary, colors.elevation1]
  );

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
      {/* Streak Counter - Circular Badge Design */}
      <Pressable
        onPress={handleStreakPress}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
        style={{ padding: LAYOUT.SPACING.TINY }} // Add padding for better touch target
      >
        <View style={streakBadgeStyle}>
          <Ionicons
            name="flame"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={hasStreak ? colors.warning : colors.textTertiary}
          />
          <ThemedText
            type="caption"
            weight="bold"
            style={[
              styles.streakText,
              {
                color: hasStreak ? colors.warning : colors.textTertiary,
                position: 'absolute',
                bottom: -2,
                right: -2,
                backgroundColor: colors.background,
                borderRadius: 8,
                paddingHorizontal: LAYOUT.SPACING.MICRO,
                paddingVertical: LAYOUT.SPACING.MICRO / 4,
                fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                minWidth: 16,
                height: 16,
                textAlign: 'center',
                lineHeight: 14,
              },
            ]}
            numberOfLines={1}
          >
            {currentStreak}
          </ThemedText>
        </View>
      </Pressable>

      {/* Profile Button */}
      <Pressable onPress={handlePress} style={styles.profileButton}>
        {profilePhotoUri ? (
          <Image
            source={{ uri: profilePhotoUri }}
            style={profilePhotoStyle}
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
              style={[
                styles.initialsText,
                { fontSize: size * 0.45, color: isDarkMode ? colors.black : colors.white },
              ]}
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
