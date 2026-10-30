import { Modal } from 'react-native';

import { ConsentScreen } from '@/components/privacy/ConsentScreen';
import { useConsent } from '@/hooks/privacy/useConsent';

/** Android's back press has nowhere to go: a decision is one tap away, either way. */
const ignoreBackPress = () => undefined;

/**
 * The consent step, over whatever the app is showing, as soon as the stored choice
 * has loaded and turned out to be none. Its own component so the subscription
 * doesn't re-render the root layout that mounts it.
 */
export const ConsentOverlay = () => {
  const { isLoaded, consent } = useConsent();

  return (
    <Modal
      visible={isLoaded && consent === null}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={ignoreBackPress}
    >
      <ConsentScreen />
    </Modal>
  );
};
