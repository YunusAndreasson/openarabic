import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, FlatList, View, Animated } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { readingListService } from '@/services/reading_list';
import { useAuth } from '@/hooks/useAuth';
import PlaylistCard from '@/components/PlaylistCard';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { Audio } from 'expo-av';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM,
  },
  message: {
    textAlign: 'center',
    marginTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM,
    opacity: 0.6,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    gap: LAYOUT.SPACING.SMALL,
  },
  button: {
    flex: 1,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 16,
  },
  bar: {
    width: 2,
    height: 16,
    borderRadius: 1,
  },
});

function AudioWave({ isPlaying, color }: { isPlaying: boolean; color: string }) {
  const anim1 = useRef(new Animated.Value(0.4)).current;
  const anim2 = useRef(new Animated.Value(0.4)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;
  const animationsRef = useRef<Animated.CompositeAnimation>();

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

      animationsRef.current = Animated.parallel(animationSequence);
      animationsRef.current.start();
    } else {
      if (animationsRef.current) {
        animationsRef.current.stop();
        animationsRef.current = undefined;
      }
      animations.forEach(anim => {
        anim.stopAnimation();
        anim.setValue(0.4);
      });
    }

    return () => {
      if (animationsRef.current) {
        animationsRef.current.stop();
        animationsRef.current = undefined;
      }
    };
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

export default function PlaylistScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentSound, setCurrentSound] = useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledList, setShuffledList] = useState<typeof readingList>([]);
  const [playMode, setPlayMode] = useState<'normal' | 'shuffle'>('normal');
  const colors = useColors();

  const { data: readingList, isLoading } = useQuery({
    queryKey: ['readingList', user?.id],
    queryFn: () => (user?.id ? readingListService.getReadingList(user.id) : []),
    enabled: !!user?.id,
  });

  const removeFromReadingList = useMutation({
    mutationFn: (articleId: number) =>
      readingListService.removeFromReadingList(user!.id, articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingList'] });
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['readingList'] });
      }

      return () => {
        stopCurrentSound();
      };
    }, [user?.id, queryClient])
  );

  const stopCurrentSound = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (error) {
        throw error;
      }
      setCurrentSound(undefined);
      setIsPlaying(false);
    }
  };

  const playNext = async () => {
    const list = playMode === 'shuffle' ? shuffledList : readingList;
    if (!list || currentIndex >= list.length - 1) {
      setCurrentIndex(0);
      await stopCurrentSound();
      return;
    }

    setCurrentIndex(prev => prev + 1);
    await playArticle(list[currentIndex + 1].article.audio_url);
  };

  const playArticle = async (audioUrl: string) => {
    try {
      await stopCurrentSound();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        async status => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            const list = playMode === 'shuffle' ? shuffledList : readingList;
            if (list && list.length > 1) {
              await playNext();
            } else {
              await stopCurrentSound();
            }
          }
        }
      );
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      setCurrentSound(newSound);
      setIsPlaying(true);
    } catch {
      await stopCurrentSound();
    }
  };

  const handlePlayAll = async () => {
    if (isPlaying) {
      await stopCurrentSound();
    } else {
      setPlayMode('normal');
      setShuffledList([]);
      setCurrentIndex(0);
      if (readingList?.length) {
        await playArticle(readingList[0].article.audio_url);
      }
    }
  };

  const handleShuffle = async () => {
    if (!readingList?.length) return;

    if (isPlaying) {
      await stopCurrentSound();
    } else {
      setPlayMode('shuffle');
      const shuffled = [...readingList].sort(() => Math.random() - 0.5);
      setShuffledList(shuffled);
      setCurrentIndex(0);
      await playArticle(shuffled[0].article.audio_url);
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Please sign in to view your playlist</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!readingList?.length) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          Your playlist is empty. Add articles to get started!
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={readingList}
        keyExtractor={item => `${item.article_id}`}
        renderItem={({ item }) => (
          <PlaylistCard
            title={item.article.title}
            category={item.article.category.name}
            author={item.article.author.name}
            audioUrl={item.article.audio_url}
            onRemove={() => removeFromReadingList.mutate(item.article_id)}
            onPress={() => router.push(`/article/${item.article_id}`)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      <View style={[styles.controls, { borderTopColor: colors.icon }]}>
        <ThemedButton
          variant="filled"
          title={isPlaying && playMode === 'normal' ? 'Stop' : 'Play All'}
          icon={isPlaying && playMode === 'normal' ? 'stop-circle' : 'play-circle'}
          onPress={handlePlayAll}
          style={styles.button}
        >
          {isPlaying && playMode === 'normal' && (
            <AudioWave isPlaying={isPlaying} color={colors.background} />
          )}
        </ThemedButton>
        <ThemedButton
          variant="filled"
          title={isPlaying && playMode === 'shuffle' ? 'Stop' : 'Shuffle'}
          icon={isPlaying && playMode === 'shuffle' ? 'stop-circle' : 'shuffle'}
          onPress={handleShuffle}
          style={styles.button}
        >
          {isPlaying && playMode === 'shuffle' && (
            <AudioWave isPlaying={isPlaying} color={colors.background} />
          )}
        </ThemedButton>
      </View>
    </ThemedView>
  );
}
