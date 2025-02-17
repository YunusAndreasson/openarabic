import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, View, Animated, TouchableOpacity } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useNavigation } from 'expo-router';
import { ThemedText } from './ThemedText';

interface AudioPlayButtonProps {
  audioUrl: string;
}

function AudioWave({ isPlaying, color }: { isPlaying: boolean; color: string }) {
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
}

export function AudioPlayButton({ audioUrl }: AudioPlayButtonProps) {
  const colors = useColors();
  const [sound, setSound] = useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const animatePress = () => {
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
  };

  async function loadSound() {
    try {
      setIsLoading(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      setSound(sound);
      return sound;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function resetSound() {
    if (sound) {
      await sound.unloadAsync();
      setSound(undefined);
    }
  }

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        resetSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }

  async function togglePlayback() {
    try {
      animatePress();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!sound) {
        const newSound = await loadSound();
        if (newSound) {
          await newSound.playAsync();
        }
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.positionMillis === status.durationMillis) {
            await resetSound();
            const newSound = await loadSound();
            if (newSound) {
              await newSound.playAsync();
            }
          } else {
            await sound.playAsync();
          }
        }
      }
    } catch {
      await resetSound();
    }
  }

  useEffect(() => {
    loadSound();
    return () => {
      resetSound();
    };
  }, [audioUrl]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (sound) {
        sound.stopAsync();
        resetSound();
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

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    paddingBottom: 36,
    position: 'relative',
    zIndex: 1,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    minHeight: 52,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
  },
  bar: {
    width: 2,
    height: 10,
    borderRadius: 1,
    marginHorizontal: 1,
    opacity: 0.8,
  },
});
