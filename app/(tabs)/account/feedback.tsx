import { ScreenScaffold } from '@/components/common';

import { FeedbackForm } from '@/components/account';

// `padded={false}`: FeedbackForm carries its own gutters. Scrollable (the
// default) because the scaffold's scroll view is the keyboard-aware one —
// `scrollable={false}` only existed to avoid nesting the form's own.
const FeedbackScreen = () => (
  <ScreenScaffold padded={false}>
    <FeedbackForm />
  </ScreenScaffold>
);

export default FeedbackScreen;
