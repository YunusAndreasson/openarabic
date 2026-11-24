import { useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Button } from 'react-native';
import { ThemedText } from '@/components/primitives/ThemedText';
import * as SplashScreen from 'expo-splash-screen';
import { STRINGS } from '@/constants/strings';
import { accountTeardown } from '@/services/accountLifecycle';

function resume() {
  void accountTeardown.resume().catch(() => undefined);
}

export function AccountTeardownGate({ children }: PropsWithChildren) {
  const status = useSyncExternalStore(accountTeardown.subscribe, accountTeardown.snapshot);
  useEffect(() => {
    resume();
  }, []);
  useEffect(() => {
    if (status === 'failed') SplashScreen.hide();
  }, [status]);
  if (status === 'failed')
    return <Button accessibilityLabel={STRINGS.RETRY} title={STRINGS.RETRY} onPress={resume} />;
  if (status === 'deletionRetry' || status === 'deletionFailed') {
    const retryable = status === 'deletionRetry';
    return (
      <>
        {children}
        <ThemedText accessibilityRole="alert">
          {retryable ? STRINGS.DELETION_RETRY_MESSAGE : STRINGS.FAILED_TO_DELETE_ACCOUNT}
        </ThemedText>
        <Button
          accessibilityLabel={retryable ? STRINGS.RETRY : STRINGS.DONE}
          title={retryable ? STRINGS.RETRY : STRINGS.DONE}
          onPress={
            retryable
              ? () => void accountTeardown.retry().catch(() => undefined)
              : accountTeardown.dismissFailure
          }
        />
      </>
    );
  }
  return status === 'ready' || status === 'deletionPending' ? children : null;
}
