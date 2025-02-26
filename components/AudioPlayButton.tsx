import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useNavigation } from 'expo-router';
import { LAYOUT } from '@/constants/layout';
import { ThemedButton } from './ThemedButton';
import { Ionicons } from '@expo/vector-icons';

interface AudioPlayButtonProps {
  audioUrl: string;
  style?: any;
}

// Custom AudioWaveIcon component that can be placed in the icon position
const AudioWaveIcon = React.memo(({ color }: { color: string }) => {
  const anim1 = useRef(new Animated.Value(0.4)).current;
  const anim2 = useRef(new Animated.Value(0.4)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;

  const animations = useMemo(() => [anim1, anim2, anim3], [anim1, anim2, anim3]);

  useEffect(() => {
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

    return () => {
      animations.forEach(anim => {
        anim.stopAnimation();
      });
    };
  }, [animations]);

  return (
    <View style={styles.iconWaveContainer}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.iconBar,
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

// Main component with optimizations
function AudioPlayButtonComponent({ audioUrl, style }: AudioPlayButtonProps) {
  const colors = useColors();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const soundRef = useRef<Audio.Sound | null>(null);

  // Memoize the onPlaybackStatusUpdate function
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  }, []);

  // Memoize the togglePlayback function
  const togglePlayback = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      if (!sound) {
        setIsLoading(true);
        // Create a new sound instance
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );

        // Store in state and ref
        setSound(newSound);
        soundRef.current = newSound;
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      // Get the latest status
      const status = await sound.getStatusAsync();

      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
        } else {
          // If it reached the end, seek to start
          if (
            status.positionMillis !== undefined &&
            status.durationMillis !== undefined &&
            status.positionMillis >= status.durationMillis - 100
          ) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
        }
      } else {
        // Sound was unloaded, create a new one
        setIsLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        soundRef.current = newSound;
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error toggling playback', error);
      setIsLoading(false);

      // Reset if there was an error
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (e) {
          // Ignore errors during cleanup
        }
        setSound(null);
        soundRef.current = null;
      }
    }
  }, [sound, audioUrl, onPlaybackStatusUpdate]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      const currentSound = soundRef.current;
      if (currentSound) {
        currentSound.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  // Stop audio when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const currentSound = soundRef.current;
      if (currentSound) {
        currentSound.stopAsync().catch(() => {});
      }
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ThemedButton
        variant={isPlaying ? 'outlined' : 'filled'}
        title={isPlaying ? 'Pause' : 'Play'}
        icon={isPlaying ? undefined : 'play-circle'}
        iconComponent={isPlaying ? <AudioWaveIcon color={colors.tint} /> : undefined}
        onPress={togglePlayback}
        disabled={isLoading}
        loading={isLoading}
        style={styles.button}
      />
    </View>
  );
}

// Memoize the entire component
export const AudioPlayButton = React.memo(AudioPlayButtonComponent);

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
    marginLeft: 0, // Reduced margin to place closer to the text
  },
  bar: {
    width: 2,
    height: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.SPACING.TINY / 4,
    marginHorizontal: LAYOUT.SPACING.TINY / 4,
    opacity: 0.8,
  },
  iconWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    width: 24,
    justifyContent: 'center',
  },
  iconBar: {
    width: 2,
    height: 16,
    borderRadius: 1,
    marginHorizontal: 1,
    opacity: 0.8,
  },
});
