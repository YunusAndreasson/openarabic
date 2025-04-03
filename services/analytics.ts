import { Platform } from 'react-native';
import { Mixpanel } from 'mixpanel-react-native';

// Initialize Mixpanel with your project token
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || 'YOUR_MIXPANEL_TOKEN';

// Option to disable tracking in development
const ENABLE_DEV_TRACKING = true; // Set this to false to disable tracking in development

// Event Names
const EVENTS = {
  // Auth Events
  SIGN_UP: 'Sign Up',
  SIGN_IN: 'Sign In',
  SIGN_OUT: 'Sign Out',

  // Article Events
  VIEW_ARTICLE: 'View Article',
  COMPLETE_ARTICLE: 'Complete Article',
  TOGGLE_READING_LIST: 'Toggle Reading List',

  // Study Events
  ADD_STUDY_WORD: 'Add Study Word',
  REMOVE_STUDY_WORD: 'Remove Study Word',
  COMPLETE_REVIEW: 'Complete Review',

  // Reading List Events
  VIEW_READING_LIST: 'View Reading List',
} as const;

// User Properties
const USER_PROPERTIES = {
  TOTAL_ARTICLES_READ: 'Total Articles Read',
  TOTAL_WORDS_STUDIED: 'Total Words Studied',
  READING_LIST_COUNT: 'Reading List Count',
  STUDY_WORDS_COUNT: 'Study Words Count',
} as const;

class Analytics {
  private mixpanel!: Mixpanel;
  private isInitialized: boolean = false;

  constructor() {
    // Skip initialization in development if tracking is disabled
    if (__DEV__ && !ENABLE_DEV_TRACKING) {
      console.log('Analytics tracking disabled in development mode');
      return;
    }

    // Disable legacy autotrack mobile events
    const trackAutomaticEvents = false;

    // Use Native Mode by default
    const useNative = true;

    // Set server URL (use api-eu.mixpanel.com for EU data residency if needed)
    const serverURL = 'https://api.mixpanel.com';

    // Opt users into tracking by default
    const optOutTrackingDefault = false;

    // Set default super properties
    const superProperties = {
      platform: Platform.OS,
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      environment: __DEV__ ? 'development' : 'production',
    };

    this.mixpanel = new Mixpanel(
      MIXPANEL_TOKEN,
      trackAutomaticEvents,
      useNative,
      serverURL,
      optOutTrackingDefault,
      superProperties
    );

    // Initialize Mixpanel
    this.init();
  }

  private async init() {
    // Skip initialization in development if tracking is disabled
    if (__DEV__ && !ENABLE_DEV_TRACKING) return;

    try {
      await this.mixpanel.init();
      this.isInitialized = true;

      // Enable debug logs in development
      if (__DEV__) {
        this.mixpanel.setLoggingEnabled(true);
        console.log('Analytics initialized in development mode');
      }
    } catch (error) {
      console.error('Error initializing Mixpanel:', error);
    }
  }

  // Initialize user profile
  async identify(userId: string, userProperties?: Record<string, any>) {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.identify(userId);
      if (userProperties) {
        await this.mixpanel.getPeople().set(userProperties);
      }
    } catch (error) {
      console.error('Error identifying user:', error);
    }
  }

  // Track an event
  async track(eventName: string, properties?: Record<string, any>) {
    // Skip tracking in development if disabled
    if (__DEV__ && !ENABLE_DEV_TRACKING) {
      console.log('Development tracking disabled. Would have tracked:', eventName, properties);
      return;
    }

    if (!this.isInitialized) return;

    try {
      await this.mixpanel.track(eventName, {
        ...properties,
        environment: __DEV__ ? 'development' : 'production',
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Update user profile properties
  async updateUserProfile(properties: Record<string, any>) {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.getPeople().set(properties);
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  }

  // Track page/screen view
  async trackScreen(screenName: string, properties?: Record<string, any>) {
    await this.track('Screen View', {
      screen: screenName,
      ...properties,
    });
  }

  // Reset user (for logout)
  async reset() {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.reset();
    } catch (error) {
      console.error('Error resetting analytics:', error);
    }
  }

  // Set super properties that will be included with all subsequent track calls
  async setSuperProperties(properties: Record<string, any>) {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.registerSuperProperties(properties);
    } catch (error) {
      console.error('Error setting super properties:', error);
    }
  }

  // Time an event
  async timeEvent(eventName: string) {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.timeEvent(eventName);
    } catch (error) {
      console.error('Error timing event:', error);
    }
  }

  // Opt out of tracking (GDPR)
  async optOutTracking() {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.optOutTracking();
    } catch (error) {
      console.error('Error opting out of tracking:', error);
    }
  }

  // Opt in to tracking (GDPR)
  async optInTracking() {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.optInTracking();
    } catch (error) {
      console.error('Error opting in to tracking:', error);
    }
  }

  // Get the distinct ID of the current user
  async getDistinctId(): Promise<string | null> {
    if (!this.isInitialized) return null;

    try {
      return await this.mixpanel.getDistinctId();
    } catch (error) {
      console.error('Error getting distinct ID:', error);
      return null;
    }
  }

  // Auth Events
  async trackSignUp(method: string = 'email') {
    await this.track(EVENTS.SIGN_UP, { method });
  }

  async trackSignIn(method: string = 'email') {
    await this.track(EVENTS.SIGN_IN, { method });
  }

  async trackSignOut() {
    await this.track(EVENTS.SIGN_OUT);
  }

  // Article Events
  async trackViewArticle(
    articleId: number,
    articleProperties: {
      title?: string;
      category?: string;
      wordCount?: number;
      sentenceCount?: number;
    }
  ) {
    await this.track(EVENTS.VIEW_ARTICLE, {
      article_id: articleId,
      ...articleProperties,
    });
  }

  async trackCompleteArticle(
    articleId: number,
    properties: {
      timeSpent?: number;
      wordsAdded?: number;
    }
  ) {
    await this.track(EVENTS.COMPLETE_ARTICLE, {
      article_id: articleId,
      ...properties,
    });
  }

  async trackToggleReadingList(articleId: number, added: boolean) {
    await this.track(EVENTS.TOGGLE_READING_LIST, {
      article_id: articleId,
      action: added ? 'add' : 'remove',
    });
  }

  // Study Events
  async trackAddStudyWord(
    wordId: number,
    properties: {
      word?: string;
      english?: string;
      articleId?: number;
    }
  ) {
    await this.track(EVENTS.ADD_STUDY_WORD, {
      word_id: wordId,
      ...properties,
    });
  }

  async trackRemoveStudyWord(
    wordId: number,
    properties: {
      word?: string;
      english?: string;
      timeStudied?: number;
    }
  ) {
    await this.track(EVENTS.REMOVE_STUDY_WORD, {
      word_id: wordId,
      ...properties,
    });
  }

  async trackCompleteReview(properties: {
    wordsReviewed: number;
    correctCount: number;
    incorrectCount: number;
    timeSpent: number;
  }) {
    await this.track(EVENTS.COMPLETE_REVIEW, properties);
  }

  // Reading List Events
  async trackViewReadingList(properties: { totalCount: number; completedCount: number }) {
    await this.track(EVENTS.VIEW_READING_LIST, properties);
  }

  // Update User Properties
  async updateUserStats(stats: {
    totalArticlesRead?: number;
    totalWordsStudied?: number;
    readingListCount?: number;
    studyWordsCount?: number;
  }) {
    const properties: Record<string, number> = {};

    if (stats.totalArticlesRead !== undefined) {
      properties[USER_PROPERTIES.TOTAL_ARTICLES_READ] = stats.totalArticlesRead;
    }
    if (stats.totalWordsStudied !== undefined) {
      properties[USER_PROPERTIES.TOTAL_WORDS_STUDIED] = stats.totalWordsStudied;
    }
    if (stats.readingListCount !== undefined) {
      properties[USER_PROPERTIES.READING_LIST_COUNT] = stats.readingListCount;
    }
    if (stats.studyWordsCount !== undefined) {
      properties[USER_PROPERTIES.STUDY_WORDS_COUNT] = stats.studyWordsCount;
    }

    await this.updateUserProfile(properties);
  }
}

// Export a singleton instance
export const analytics = new Analytics();
