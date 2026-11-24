import { widgetBridge } from './native';
import type * as Expo from 'expo';
import { Platform } from 'react-native';

/** Android keeps its last RemoteViews even when the rendering process dies. */
export async function submitPublicWidget(name: string, word: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!widgetBridge) throw new Error('Widget privacy service is unavailable');
  if (Platform.OS !== 'android') return;
  const { requireNativeModule } = require('expo') as typeof Expo;
  const host = requireNativeModule<{
    submitPublicWidget(name: string, word: string): Promise<void>;
  }>('ExpoWidgets');
  await host.submitPublicWidget(name, word);
}
