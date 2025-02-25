import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useColors } from '../hooks/useColors';
import { useNavigation } from 'expo-router';
import { LAYOUT } from '../constants/layout';
import { ThemedButton } from './ThemedButton';
import { readingListService } from '../services/reading_list';
import { useAuth } from '../hooks/useAuth';
import Toast from 'react-native-toast-message';

// Types for the ActionButton
type ActionType = 'audio' | 'readingList';
type ButtonVariant = 'filled' | 'outlined';

interface ActionButtonProps {
  type: ActionType;
  audioUrl?: string;
  articleId?: number;
  style?: any;
}

// AudioWave component for audio playback visualization
const AudioWave = React.memo(({ isPlaying, color }: { isPlaying: boolean; color: string }) => {
  const anim1 = useRef(new Animated.Value(0.4)).current;
  const anim2 = useRef(new Animated.Value(0.4)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;

  const animations = useMemo(() => [anim1, anim2, anim3], [anim1, anim2, anim3]);

  useEffect(() => {
    if (isPlaying) {
      const animationSequence = animations.map((anim, i) =>
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0.4,
                duration: 500,
                useNativeDriver: true,
              }),
            ])
          ),
        ])
      );

      Animated.parallel(animationSequence).start();
    } else {
      animations.forEach(anim => {
        anim.stopAnimation();
        anim.setValue(0.4);
      });
    }
  }, [isPlaying, animations]);

  return (
    <View style={styles.waveContainer}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
});

// Main ActionButton component
export function ActionButton({ type, audioUrl, articleId, style }: ActionButtonProps) {
  const colors = useColors();

  // Shared state
  const [isLoading, setIsLoading] = useState(false);

  // Audio-specific state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigation = useNavigation();

  // Reading list specific state
  const [isInReadingList, setIsInReadingList] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

  // Audio functions
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  }, []);

  const loadSound = useCallback(async () => {
    if (!audioUrl) return;

    try {
      setIsLoading(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(sound);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading sound', error);
      setIsLoading(false);
    }
  }, [audioUrl, onPlaybackStatusUpdate]);

  // Reading list functions
  const checkReadingListStatus = useCallback(async () => {
    if (!articleId || !user) return;

    try {
      const status = await readingListService.isInReadingList(user.id, articleId);
      setIsInReadingList(status);
    } catch (error) {
      console.error('Error checking reading list status', error);
    } finally {
      setIsLoading(false);
    }
  }, [articleId, user]);

  // Handle button press based on type
  const handlePress = useCallback(
    async (event: any) => {
      if (type === 'audio') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

        if (!sound) {
          await loadSound();
          return;
        }

        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await sound.pauseAsync();
            } else {
              await sound.playAsync();
            }
          }
        } catch (error) {
          console.error('Error toggling playback', error);
        }
      } else if (type === 'readingList') {
        if (!user || !articleId) return;

        setIsLoading(true);
        try {
          if (isInReadingList) {
            await readingListService.removeFromReadingList(user.id, articleId);
          } else {
            await readingListService.addToReadingList(user.id, articleId);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Toast.show({
              type: 'success',
              text1: 'Added to playlist',
              text2: 'Ready for listening on the go',
              position: 'bottom',
              visibilityTime: 3000,
            });
          }
          setIsInReadingList(!isInReadingList);
        } catch (error) {
          console.error('Error toggling reading list', error);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [type, sound, loadSound, user, articleId, isInReadingList]
  );

  // Initialize based on type
  useEffect(() => {
    if (type === 'audio' && audioUrl) {
      loadSound();

      // Cleanup audio on unmount
      return () => {
        if (sound) {
          sound.unloadAsync();
        }
      };
    } else if (type === 'readingList' && articleId && user && !isAuthLoading) {
      checkReadingListStatus();
    } else if (type === 'readingList') {
      setIsLoading(false);
    }
  }, [type, audioUrl, articleId, user, isAuthLoading, loadSound, sound, checkReadingListStatus]);

  // Stop audio when navigating away
  useEffect(() => {
    if (type === 'audio') {
      const unsubscribe = navigation.addListener('beforeRemove', () => {
        if (sound) {
          sound.stopAsync();
        }
      });
      return unsubscribe;
    }
  }, [type, sound, navigation]);

  // Determine button props based on type
  const getButtonProps = () => {
    if (type === 'audio') {
      return {
        variant: isPlaying ? 'outlined' : ('filled' as ButtonVariant),
        title: isPlaying ? 'Pause' : 'Play',
        disabled: false,
        children: audioUrl ? (
          <AudioWave isPlaying={isPlaying} color={isPlaying ? colors.tint : colors.background} />
        ) : null,
      };
    } else if (type === 'readingList') {
      return {
        variant: isInReadingList ? 'outlined' : ('filled' as ButtonVariant),
        title: isInReadingList ? 'In playlist' : 'Add to playlist',
        icon: isInReadingList ? 'bookmark' : 'bookmark-outline',
        disabled: !user || isLoading,
      };
    }

    return { variant: 'filled' as ButtonVariant, title: 'Action' };
  };

  const buttonProps = getButtonProps();

  return (
    <View style={styles.container}>
      <ThemedButton
        variant={buttonProps.variant}
        title={buttonProps.title}
        icon={buttonProps.icon}
        onPress={handlePress}
        disabled={buttonProps.disabled}
        loading={isLoading}
        style={[styles.button, style]}
      >
        {buttonProps.children}
      </ThemedButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
  button: {
    width: '100%',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LAYOUT.SPACING.LARGE,
    marginLeft: LAYOUT.SPACING.MEDIUM,
  },
  bar: {
    width: 2,
    height: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.SPACING.TINY / 4,
    marginHorizontal: LAYOUT.SPACING.TINY / 4,
    opacity: 0.8,
  },
});
