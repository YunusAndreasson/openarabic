import { ScreenScaffold } from '@/components/common';

import { FeedbackForm } from '@/components/account';

// `padded={false}`: FeedbackForm carries its own gutters.
const FeedbackScreen = () => (
  <ScreenScaffold padded={false} scrollable={false}>
    <FeedbackForm />
  </ScreenScaffold>
);

export default FeedbackScreen;
