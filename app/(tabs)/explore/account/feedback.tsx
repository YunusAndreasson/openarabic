import { ScreenScaffold } from '@/components/common';
import type { FC } from 'react';

import { FeedbackForm } from '@/components/account';

// `padded={false}`: FeedbackForm carries its own gutters.
const FeedbackScreen: FC = () => (
  <ScreenScaffold padded={false}>
    <FeedbackForm />
  </ScreenScaffold>
);

export default FeedbackScreen;
