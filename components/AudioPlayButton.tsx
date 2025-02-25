import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useNavigation } from 'expo-router';
import { LAYOUT } from '@/constants/layout';
import { ThemedButton } from './ThemedButton';

interface AudioPlayButtonProps {
  audioUrl: string;
  style?: any;
}

// Memoize the AudioWave component to prevent unnecessary rerenders
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

// Main component with optimizations
function AudioPlayButtonComponent({ audioUrl, style }: AudioPlayButtonProps) {
  const colors = useColors();
  const [sound, setSound] = useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  // Memoize the loadSound function
  const loadSound = useCallback(async () => {
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
  }, [audioUrl]);

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
  const togglePlayback = useCallback(
    async (event: any) => {
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
    },
    [sound, loadSound]
  );

  // Load sound on mount and unload on unmount
  useEffect(() => {
    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioUrl, loadSound, sound]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (sound) {
        sound.stopAsync();
      }
    });
    return unsubscribe;
  }, [sound, navigation]);

  return (
    <View style={styles.container}>
      <ThemedButton
        variant={isPlaying ? 'outlined' : 'filled'}
        title={isPlaying ? 'Pause' : 'Play'}
        onPress={togglePlayback}
        disabled={false}
        loading={isLoading}
        style={[styles.button, style]}
      >
        <AudioWave isPlaying={isPlaying} color={isPlaying ? colors.tint : colors.background} />
      </ThemedButton>
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
