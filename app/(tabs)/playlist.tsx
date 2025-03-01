import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, FlatList, View, Animated, Platform, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { readingListService } from '@/services/reading_list';
import { useAuth } from '@/hooks/useAuth';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { Audio } from 'expo-av';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { LoadingScreen } from '../../components/Loader';
import { Ionicons } from '@expo/vector-icons';
import { CompactThemedCard } from '@/components/CompactThemedCard';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  headerIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + 100,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  emptyStateTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  emptyStateMessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    backgroundColor: 'transparent',
  },
  controlsCard: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  controlsContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  nowPlayingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    height: 60,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.MEDIUM,
  },
  nowPlayingTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  nowPlayingMeta: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: LAYOUT.SPACING.SMALL,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
    height: LAYOUT.BUTTON.HEIGHT.LARGE,
  },
  button: {
    flex: 1,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
  },
  skipButton: {
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 16,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  bar: {
    width: 2,
    height: 16,
    borderRadius: 1,
  },
  listSeparator: {
    height: LAYOUT.SPACING.SMALL,
  },
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.SMALL,
    minHeight: 56,
  },
  articleTextContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  articleTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  articleAuthor: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  playerPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  playerPlaceholderText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  compactPlayer: {
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  playerSection: {
    height: 72,
    justifyContent: 'center',
  },
  progressWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

const AudioWave = React.memo(({ isPlaying, color }: { isPlaying: boolean; color: string }) => {
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
});

const ArticleCard = React.memo(
  ({
    title,
    author,
    onPress,
  }: {
    title: string;
    category: string;
    author: string;
    onPress: () => void;
  }) => {
    const colors = useColors();

    return (
      <CompactThemedCard onPress={onPress}>
        <View style={styles.articleCard}>
          <View style={styles.articleTextContainer}>
            <ThemedText numberOfLines={1} style={styles.articleTitle}>
              {title}
            </ThemedText>
            <ThemedText
              style={[styles.articleAuthor, { color: colors.authorText }]}
              skipDefaultColor
              numberOfLines={1}
            >
              {author}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ opacity: 0.3 }} />
        </View>
      </CompactThemedCard>
    );
  }
);

export default function PlaylistScreen() {
  const colors = useColors();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentSound, setCurrentSound] = useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledList, setShuffledList] = useState<typeof readingList>([]);
  const [playMode, setPlayMode] = useState<'normal' | 'shuffle'>('normal');
  const [playProgress, setPlayProgress] = useState(0);
  const progressUpdateInterval = useRef<NodeJS.Timeout>();

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
        if (progressUpdateInterval.current) {
          clearInterval(progressUpdateInterval.current);
        }
      };
    }, [user?.id, queryClient])
  );

  const stopCurrentSound = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
      setCurrentSound(undefined);
      setIsPlaying(false);
      setPlayProgress(0);
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
        progressUpdateInterval.current = undefined;
      }
    }
  };

  const updatePlayProgress = async () => {
    if (currentSound) {
      try {
        const status = await currentSound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setPlayProgress(status.positionMillis / status.durationMillis);
        }
      } catch (error) {
        console.error('Error updating play progress:', error);
      }
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
      setPlayProgress(0);

      // Start progress update interval
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
      progressUpdateInterval.current = setInterval(updatePlayProgress, 500);
    } catch (error) {
      console.error('Error playing article:', error);
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

  // Render empty state for not logged in users
  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Playlist</ThemedText>
        </View>
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateTitle}>Sign In Required</ThemedText>
          <ThemedText style={styles.emptyStateMessage}>
            Please sign in to view and manage your saved articles
          </ThemedText>
          <ThemedButton
            title="Go to Profile"
            icon="person-circle"
            onPress={() => router.push('/(tabs)/profile' as any)}
          />
        </View>
      </ThemedView>
    );
  }

  // Show loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Get the currently playing article
  const currentArticle = isPlaying
    ? playMode === 'shuffle' && shuffledList
      ? shuffledList[currentIndex]
      : readingList?.[currentIndex]
    : null;

  // Render empty playlist state
  if (!readingList?.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Playlist</ThemedText>
        </View>
        <View style={styles.emptyStateContainer}>
          <ThemedText style={styles.emptyStateTitle}>No saved articles yet</ThemedText>
          <ThemedText style={styles.emptyStateMessage}>
            Save articles to listen to them later or read them offline
          </ThemedText>
          <ThemedButton title="Browse Articles" icon="newspaper" onPress={() => router.push('/')} />
        </View>
        <View style={styles.controlsContainer}>
          <View
            style={[
              styles.controlsCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={[styles.controlsContent]}>
              <View
                style={[
                  styles.playerPlaceholder,
                  styles.playerSection,
                  {
                    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
                    borderBottomColor: colors.cardBorder + '40',
                    marginBottom: LAYOUT.SPACING.MEDIUM,
                    paddingBottom: LAYOUT.SPACING.MEDIUM,
                  },
                ]}
              >
                <Ionicons
                  name="headset"
                  size={22}
                  color={colors.text}
                  style={{ opacity: LAYOUT.OPACITY.DIMMED }}
                />
                <ThemedText style={styles.playerPlaceholderText}>
                  Add articles to start listening
                </ThemedText>
              </View>
              <View style={styles.buttonRow}>
                <ThemedButton
                  variant="filled"
                  title="Play All"
                  icon="play-circle"
                  onPress={() => {}}
                  style={styles.button}
                  disabled={true}
                />
                <ThemedButton
                  variant="filled"
                  title="Shuffle"
                  icon="shuffle"
                  onPress={() => {}}
                  style={styles.button}
                  disabled={true}
                />
              </View>
            </View>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Playlist</ThemedText>
      </View>

      <FlatList
        data={readingList}
        keyExtractor={item => `${item.article_id}`}
        renderItem={({ item }) => (
          <ArticleCard
            title={item.article.title}
            category={item.article.category.name}
            author={item.article.author.name}
            onPress={() => router.push(`/article/${item.article_id}`)}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={10}
      />

      <View style={styles.controlsContainer}>
        <View
          style={[
            styles.controlsCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.controlsContent}>
            {currentArticle && isPlaying ? (
              <View style={styles.playerSection}>
                <View
                  style={[
                    styles.nowPlayingContainer,
                    { borderBottomColor: colors.cardBorder + '40' },
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: colors.tint + '10',
                        borderColor: colors.cardBorder + '40',
                      },
                    ]}
                  >
                    <AudioWave isPlaying={isPlaying} color={colors.tint} />
                  </View>
                  <View style={styles.nowPlayingInfo}>
                    <ThemedText style={styles.nowPlayingTitle} numberOfLines={1}>
                      {currentArticle.article.title}
                    </ThemedText>
                    <ThemedText style={styles.nowPlayingMeta} numberOfLines={1}>
                      {currentArticle.article.author.name}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.progressWrapper}>
                  <View style={styles.progressContainer}>
                    <Animated.View
                      style={[
                        styles.progressBar,
                        {
                          width: `${playProgress * 100}%`,
                          backgroundColor: colors.tint,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View
                style={[
                  styles.playerSection,
                  {
                    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
                    borderBottomColor: colors.cardBorder + '40',
                    marginBottom: LAYOUT.SPACING.MEDIUM,
                  },
                ]}
              >
                <View style={styles.playerPlaceholder}>
                  <Ionicons
                    name="headset"
                    size={22}
                    color={colors.text}
                    style={{ opacity: LAYOUT.OPACITY.DIMMED }}
                  />
                  <ThemedText style={styles.playerPlaceholderText}>Ready to play</ThemedText>
                </View>
              </View>
            )}
            <View style={styles.buttonRow}>
              <ThemedButton
                variant="filled"
                title={isPlaying && playMode === 'normal' ? 'Stop' : 'Play All'}
                icon={isPlaying && playMode === 'normal' ? 'stop-circle' : 'play-circle'}
                onPress={handlePlayAll}
                style={styles.button}
              />
              <ThemedButton
                variant="filled"
                title={isPlaying && playMode === 'shuffle' ? 'Stop' : 'Shuffle'}
                icon={isPlaying && playMode === 'shuffle' ? 'stop-circle' : 'shuffle'}
                onPress={handleShuffle}
                style={styles.button}
              />
            </View>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}
