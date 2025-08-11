import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { getSafeStorage } from '@/utils/safeAsyncStorage';
import { getFirstNameFromEmail } from '@/utils/stringUtils';

// Static constants for performance
const PROFILE_PHOTO_SIZE = 64;
const ANIMATION_DURATION = 300;
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

interface AccountBadgeProps {
  userEmail: string;
  userId: string;
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
const getMemberSinceDate = () => {
  // Use a date from when the app might have launched (adjust as needed)
  return '2024-01-01T00:00:00.000Z';
};

const AccountBadge: React.FC<AccountBadgeProps> = memo(({ userEmail, userId }) => {
  const colors = useColors();
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Animation values
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(0);

  // Derived values
  const firstName = getFirstNameFromEmail(userEmail);
  const memberSince = formatMemberSince(getMemberSinceDate());
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
        setIsLoadingInitial(false);
        // Animate in after loading
        opacityValue.value = withTiming(1, { duration: ANIMATION_DURATION });
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
        setIsLoading(true);
        const selectedUri = result.assets[0].uri;

        // Save to local storage
        const storage = getSafeStorage();
        await storage.setItem(storageKey, selectedUri);

        // Update state
        setProfilePhotoUri(selectedUri);

        // Success feedback after selection completed
        // Using selection-like subtle feedback is fine here, but we keep a single call
        // Consider mediumFeedback in future if we want stronger confirmation
        // Keep as selectionFeedback to align with subtle action
        selectionFeedback();
      }
    } catch (error) {
      handleError(error as Error, {
        toastMessage: 'Failed to select profile photo',
        showToast: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  // Handle photo press animation
  const handlePhotoPress = useCallback(() => {
    scaleValue.value = withSequence(withSpring(0.95, SPRING_CONFIG), withSpring(1, SPRING_CONFIG));
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
  const dynamicStyles = React.useMemo(
    () => ({
      profileCard: [
        styles.profileCard,
        {
          backgroundColor: colors.card,
          ...LAYOUT.ELEVATION.SMALL,
        },
      ],
      // Use elevation color so the inner badge harmonizes with dark mode without white fill
      initialsContainer: [styles.initialsContainer, { backgroundColor: colors.elevation2 }],
      photoRing: [styles.photoRing, { borderColor: colors.tint }],
      editIconContainer: [styles.editIconContainer, { backgroundColor: colors.tint }],
    }),
    [colors]
  );

  if (isLoadingInitial) {
    return (
      <View
        style={[
          styles.profileCard,
          { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <Animated.View style={[dynamicStyles.profileCard, containerAnimatedStyle]}>
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
                />
              ) : (
                <View style={dynamicStyles.initialsContainer}>
                  <ThemedText
                    type="heading2"
                    weight="bold"
                    // Use dark text to be legible on elevation background in dark mode
                    style={[styles.initialsText, { color: colors.text }]}
                  >
                    {initials}
                  </ThemedText>
                </View>
              )}

              {/* Edit Icon Overlay */}
              <View style={dynamicStyles.editIconContainer}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Ionicons name="camera" size={12} color={colors.background} />
                )}
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
  photoRing: {
    width: PROFILE_PHOTO_SIZE + 4,
    height: PROFILE_PHOTO_SIZE + 4,
    borderRadius: (PROFILE_PHOTO_SIZE + 4) / 2,
    borderWidth: LAYOUT.BORDER.WIDTH.THICK,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profilePhoto: {
    width: PROFILE_PHOTO_SIZE,
    height: PROFILE_PHOTO_SIZE,
    borderRadius: PROFILE_PHOTO_SIZE / 2,
  },
  initialsContainer: {
    width: PROFILE_PHOTO_SIZE,
    height: PROFILE_PHOTO_SIZE,
    borderRadius: PROFILE_PHOTO_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE,
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE,
    borderRadius: LAYOUT.BUTTON.ICON_SIZE.XLARGE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.ELEVATION.SMALL,
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
