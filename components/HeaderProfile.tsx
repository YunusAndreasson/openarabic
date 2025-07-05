import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';
import { getSafeStorage } from '@/utils/safeAsyncStorage';

// Helper functions from AccountBadge for consistency
const getFirstNameFromEmail = (email: string): string => {
  if (!email) return 'User';

  const localPart = email.split('@')[0];
  if (!localPart) return 'User';

  // Handle common separators and capitalize
  const cleanName = localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  return cleanName.split(' ')[0] || 'User';
};

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
  const { user } = useAuth();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  const handlePress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT);
  }, []);

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
      <Pressable
        onPress={handlePress}
        style={[styles.profileButton, { backgroundColor: colors.elevation1 }]}
      >
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
              style={[styles.initialsText, { fontSize: size * 0.4, color: 'white' }]}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.TINY,
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    overflow: 'hidden',
  },
  profilePhoto: {
    // Dynamic styles applied inline
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    // Dynamic styles applied inline
  },
});

export default HeaderProfile;
