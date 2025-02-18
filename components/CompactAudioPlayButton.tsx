import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

interface CompactAudioPlayButtonProps {
  audioUrl: string;
  size?: number;
  style?: any;
}

export function CompactAudioPlayButton({
  audioUrl,
  size = 20,
  style,
}: CompactAudioPlayButtonProps) {
  const colors = useColors();
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound>();

  async function playSound() {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Silently handle error - audio playback is not critical
      setIsPlaying(false);
      if (sound) {
        await sound.unloadAsync();
        setSound(undefined);
      }
    }
  }

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  }

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <TouchableOpacity onPress={playSound} style={[styles.button, style]}>
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={size} color={colors.tint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
