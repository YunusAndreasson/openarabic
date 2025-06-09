import { Mixpanel } from 'mixpanel-react-native';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { handleError } from '@/utils/errorHandling';


const logError = (error: unknown): void => {
  handleError(error instanceof Error ? error : new Error(String(error)), {
    showToast: false,
    sentrySeverity: 'warning',
  });
};

type AnalyticsProperties =
  AnalyticsProperties[] | boolean | number | string | { [key: string]: AnalyticsProperties } | null | undefined;


const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || 'YOUR_MIXPANEL_TOKEN';


const ENABLE_DEV_TRACKING = false;


const EVENTS = {

  SIGN_UP: 'Sign Up',
  SIGN_IN: 'Sign In',
  SIGN_OUT: 'Sign Out',


  VIEW_ARTICLE: 'View Article',
  COMPLETE_ARTICLE: 'Complete Article',
  TOGGLE_READING_LIST: 'Toggle Reading List',


  ADD_STUDY_WORD: 'Add Study Word',
  REMOVE_STUDY_WORD: 'Remove Study Word',
  COMPLETE_REVIEW: 'Complete Review',


  VIEW_READING_LIST: 'View Reading List',


  SET_REMINDER_TIME: 'Set Reminder Time',
  TOGGLE_REMINDER: 'Toggle Reminder',
} as const;


class Analytics {
  private mixpanel!: Mixpanel;
  private isInitialized: boolean = false;

  constructor() {

    if (__DEV__ && !ENABLE_DEV_TRACKING) {
      return;
    }


    const trackAutomaticEvents = false;


    const useNative = false;


    const serverURL = 'https:


    const optOutTrackingDefault = false;


    const superProperties = {
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
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


    this.init();
  }

  private async init() {

    if (__DEV__ && !ENABLE_DEV_TRACKING) return;

    try {
      await this.mixpanel.init();
      this.isInitialized = true;


      if (__DEV__) {
        this.mixpanel.setLoggingEnabled(true);
      }
    } catch (error) {
      logError(error);
    }
  }


  async identify(userId: string, userProperties?: Record<string, AnalyticsProperties>) {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.identify(userId);
      if (userProperties) {
        await this.mixpanel.getPeople().set(userProperties);
      }
    } catch (error) {
      logError(error);
    }
  }


  async track(eventName: keyof typeof EVENTS, properties?: Record<string, AnalyticsProperties>) {

    if (__DEV__ && !ENABLE_DEV_TRACKING) {
      return;
    }

    if (!this.isInitialized) return;

    try {
      await this.mixpanel.track(EVENTS[eventName], {
        ...properties,
        environment: __DEV__ ? 'development' : 'production',
      });
    } catch (error) {
      logError(error);
    }
  }



  async reset() {
    if (!this.isInitialized) return;

    try {
      await this.mixpanel.reset();
    } catch (error) {
      logError(error);
    }
  }


  async trackSignUp(method: string = 'email') {
    await this.track('SIGN_UP', { method });
  }

  async trackSignIn(method: string = 'email') {
    await this.track('SIGN_IN', { method });
  }

  async trackSignOut() {
    await this.track('SIGN_OUT');
  }


  async trackViewArticle(
    articleId: number,
    articleProperties: {
      title?: string;
      category?: string;
      wordCount?: number;
      sentenceCount?: number;
    }
  ) {
    await this.track('VIEW_ARTICLE', {
      article_id: articleId,
      ...articleProperties,
    });
  }
}


export const analytics = new Analytics();
