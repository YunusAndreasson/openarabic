import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, Animated, TouchableOpacity } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useNavigation } from 'expo-router';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import { Ionicons } from '@expo/vector-icons';

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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Memoize the animation function
  const animatePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

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
  const togglePlayback = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animatePress();

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
  }, [sound, loadSound, animatePress]);

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

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: isPlaying ? colors.background : colors.tint,
    },
  ];

  const wrapperStyles = [
    styles.buttonWrapper,
    {
      transform: [{ scale: scaleAnim }],
      backgroundColor: colors.background,
      shadowColor: colors.text,
      borderColor: isPlaying ? colors.tint : colors.background,
      borderWidth: 1,
    },
  ];

  const textStyles = [
    styles.buttonText,
    {
      color: isPlaying ? colors.tint : colors.background,
    },
  ];

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <Animated.View style={wrapperStyles}>
          <TouchableOpacity
            style={buttonStyles}
            onPress={togglePlayback}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <AudioWave
                isPlaying={isPlaying}
                color={isPlaying ? colors.tint : colors.background}
              />
              <ThemedText style={textStyles} skipDefaultColor>
                {isPlaying ? 'Pause' : 'Listen'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// Memoize the entire component
export const AudioPlayButton = React.memo(AudioPlayButtonComponent);

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    paddingBottom: LAYOUT.SPACING.XXLARGE + LAYOUT.SPACING.MEDIUM,
    position: 'relative',
    zIndex: 1,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: LAYOUT.SPACING.TINY,
    elevation: 2,
    position: 'absolute',
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT.BUTTON.PADDING.VERTICAL.MEDIUM,
    paddingHorizontal: LAYOUT.BUTTON.PADDING.HORIZONTAL.LARGE,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    textAlign: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: LAYOUT.SPACING.LARGE,
  },
  bar: {
    width: 2,
    height: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.SPACING.TINY / 4,
    marginHorizontal: LAYOUT.SPACING.TINY / 4,
    opacity: 0.8,
  },
});
