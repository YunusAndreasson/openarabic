import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { studyWordsFSRSService } from './studyWordsFSRS';
import { vocabularyStatsService } from './vocabularyStats';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ReminderTime {
  hour: number;
  minute: number;
  enabled: boolean;
}

interface UserMotivationMetrics {
  currentStreak: number;
  masteredWords: number;
  retentionRate: number;
  dueWords: number;
  learningEfficiency: number;
  recentProgress: number;
}

let isInitialized = false;

async function initialize(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Colors.dark.audioControlBg,
        sound: 'default',
        enableVibrate: true,
      });
    }

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize notifications:', error);
    return false;
  }
}

/**
 * Fetch user motivation metrics from FSRS data
 */
async function getUserMotivationMetrics(userId: string): Promise<UserMotivationMetrics | null> {
  try {
    // Fetch user stats and due words in parallel
    const [userStats, dueWords, allWords] = await Promise.all([
      vocabularyStatsService.getUserStats(userId),
      studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true, limit: 50 }),
      studyWordsFSRSService.getFSRSWords(userId, { reviewedOnly: true, limit: 100 }),
    ]);

    if (!userStats || !allWords) return null;

    // Calculate retention rate from FSRS data
    const reviewedWords = allWords.filter(w => w.fsrs_reps && w.fsrs_reps > 0);
    let retentionRate = 85; // Default fallback

    if (reviewedWords.length > 0) {
      const totalReviews = reviewedWords.reduce((sum, w) => sum + (w.fsrs_reps || 0), 0);
      const totalLapses = reviewedWords.reduce((sum, w) => sum + (w.fsrs_lapses || 0), 0);
      retentionRate =
        totalReviews > 0 ? Math.round(((totalReviews - totalLapses) / totalReviews) * 100) : 85;
    }

    // Calculate learning efficiency
    let learningEfficiency = 75; // Default fallback
    if (reviewedWords.length > 0) {
      const avgStability =
        reviewedWords.reduce((sum, w) => sum + (w.fsrs_stability || 0), 0) / reviewedWords.length;
      const avgDifficulty =
        reviewedWords.reduce((sum, w) => sum + (w.fsrs_difficulty || 6.5), 0) /
        reviewedWords.length;

      // Efficiency based on stability gains vs difficulty
      learningEfficiency = Math.round(
        Math.min(100, Math.max(0, avgStability * 10 - (avgDifficulty - 5) * 5 + 50))
      );
    }

    // Calculate recent progress (words mastered in last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentMasteredWords = allWords.filter(w => {
      const lastReview = w.fsrs_last_review ? new Date(w.fsrs_last_review) : null;
      const stability = w.fsrs_stability || 0;
      const state = w.fsrs_state || 0;

      return (
        lastReview &&
        lastReview > oneWeekAgo &&
        state === 2 && // Review state
        stability >= 5
      ); // Mastery threshold
    });

    // Simple streak calculation (days with reviews in last 7 days)
    const recentReviews = allWords.filter(w => {
      const lastReview = w.fsrs_last_review ? new Date(w.fsrs_last_review) : null;
      return lastReview && lastReview > oneWeekAgo;
    });

    const currentStreak = Math.min(
      7,
      recentReviews.length > 0 ? Math.ceil(recentReviews.length / 5) : 0
    ); // Rough estimate

    return {
      currentStreak,
      masteredWords: userStats.masteredWords,
      retentionRate,
      dueWords: dueWords.length,
      learningEfficiency,
      recentProgress: recentMasteredWords.length,
    };
  } catch (error) {
    console.error('Failed to fetch user motivation metrics:', error);
    return null;
  }
}

/**
 * Generate motivating notification content based on user metrics
 */
function generateMotivatingContent(metrics: UserMotivationMetrics): {
  title: string;
  body: string;
} {
  const {
    currentStreak,
    masteredWords,
    retentionRate,
    dueWords,
    learningEfficiency,
    recentProgress,
  } = metrics;

  // Priority-based content selection
  const contentOptions: Array<{ title: string; body: string; priority: number }> = [];

  // High retention rate (celebrate success)
  if (retentionRate >= 90) {
    contentOptions.push({
      title: `Amazing ${retentionRate}% retention! 🌟`,
      body: `Your memory is incredibly strong. Keep up the excellent work!`,
      priority: 10,
    });
  } else if (retentionRate >= 80) {
    contentOptions.push({
      title: `Great ${retentionRate}% retention rate! 📈`,
      body: `You're remembering words really well. Time for your next session!`,
      priority: 8,
    });
  }

  // Learning streak motivation
  if (currentStreak >= 5) {
    contentOptions.push({
      title: `${currentStreak}-day streak going strong! 🔥`,
      body: `Don't break the momentum - your consistency is paying off!`,
      priority: 9,
    });
  } else if (currentStreak >= 3) {
    contentOptions.push({
      title: `${currentStreak} days in a row! 💪`,
      body: `You're building a great habit. Let's keep it going!`,
      priority: 7,
    });
  }

  // Recent progress celebration
  if (recentProgress >= 5) {
    contentOptions.push({
      title: `${recentProgress} words mastered this week! 🎯`,
      body: `Your progress is accelerating. Ready for more?`,
      priority: 8,
    });
  } else if (recentProgress >= 2) {
    contentOptions.push({
      title: `${recentProgress} new words mastered! ✨`,
      body: `You're making steady progress. Time to practice!`,
      priority: 6,
    });
  }

  // Mastery milestone celebration
  if (masteredWords >= 500) {
    contentOptions.push({
      title: `${masteredWords} words mastered! 🏆`,
      body: `You're becoming truly fluent. Continue your journey!`,
      priority: 9,
    });
  } else if (masteredWords >= 100) {
    contentOptions.push({
      title: `${masteredWords} words in your vocabulary! 📚`,
      body: `Your Arabic knowledge is growing strong!`,
      priority: 7,
    });
  } else if (masteredWords >= 50) {
    contentOptions.push({
      title: `${masteredWords} words learned! 🌱`,
      body: `You're building a solid foundation. Keep going!`,
      priority: 6,
    });
  }

  // Learning efficiency motivation
  if (learningEfficiency >= 85) {
    contentOptions.push({
      title: `${learningEfficiency}% learning efficiency! ⚡`,
      body: `You're learning incredibly efficiently. Time to practice!`,
      priority: 7,
    });
  }

  // Due words urgency (but positive)
  if (dueWords >= 20) {
    contentOptions.push({
      title: `${dueWords} words ready for review! 🎯`,
      body: `Perfect timing to strengthen your memory!`,
      priority: 6,
    });
  } else if (dueWords >= 10) {
    contentOptions.push({
      title: `${dueWords} words waiting for you! 📖`,
      body: `A quick session will boost your retention!`,
      priority: 5,
    });
  } else if (dueWords >= 5) {
    contentOptions.push({
      title: `${dueWords} words ready to review! ✅`,
      body: `Just a few minutes to keep your progress strong!`,
      priority: 4,
    });
  }

  // Fallback motivational content
  if (contentOptions.length === 0) {
    contentOptions.push({
      title: 'Time to practice Arabic! 📚',
      body: "Every session makes you stronger. Let's continue learning!",
      priority: 3,
    });
  }

  // Select highest priority content
  const selectedContent = contentOptions.reduce((best, current) =>
    current.priority > best.priority ? current : best
  );

  return {
    title: selectedContent.title,
    body: selectedContent.body,
  };
}

export async function scheduleReminder(
  reminderTime: ReminderTime,
  userId?: string
): Promise<string | null> {
  const initialized = await initialize();
  if (!initialized) return null;

  try {
    // Cancel existing reminder first
    await cancelReminder();

    if (!reminderTime.enabled) {
      return null;
    }

    // Get user-specific motivating content
    let title = 'Time to practice Arabic! 📚';
    let body = "Continue your Arabic learning journey with today's lesson.";

    if (userId) {
      const metrics = await getUserMotivationMetrics(userId);
      if (metrics) {
        const motivatingContent = generateMotivatingContent(metrics);
        title = motivatingContent.title;
        body = motivatingContent.body;
      }
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'reminder',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: reminderTime.hour,
        minute: reminderTime.minute,
        repeats: true,
        channelId: Platform.OS === 'android' ? 'reminders' : undefined,
      },
    });

    return identifier;
  } catch (error) {
    console.error('Failed to schedule reminder:', error);
    return null;
  }
}

export async function cancelReminder(): Promise<void> {
  try {
    // Cancel all scheduled notifications (we only have one reminder type)
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel reminders:', error);
  }
}

export async function getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to get scheduled reminders:', error);
    return [];
  }
}

export async function hasPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return false;
  }
}
