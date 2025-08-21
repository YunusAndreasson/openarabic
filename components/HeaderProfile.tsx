import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
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

  const streakTextStyle = useMemo(
    () => [styles.streakText, { color: hasStreak ? colors.warning : colors.textTertiary }],
    [hasStreak, colors.warning, colors.textTertiary]
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
      {/* Streak Counter */}
      <Pressable
        style={styles.streakContainer}
        onPress={handleStreakPress}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      >
        <Ionicons name="flame" size={16} color={hasStreak ? colors.warning : colors.textTertiary} />
        <ThemedText type="caption" style={streakTextStyle} numberOfLines={1}>
          {currentStreak}
        </ThemedText>
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
