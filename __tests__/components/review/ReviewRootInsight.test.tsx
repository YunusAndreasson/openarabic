import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { ReviewRootInsight } from '@/components/review/ReviewRootInsight';
import { STRINGS } from '@/constants/strings';

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Ionicons: () => React.createElement(View) };
});

describe('ReviewRootInsight', () => {
  test('presents the complete English root story as the recovery lesson', () => {
    const explanation =
      'Qalb is the ordinary word for the heart, and the same root carries the idea of turning or changing.';
    const { getByText, getByLabelText, getByTestId } = render(
      <ReviewRootInsight explanation={explanation} />,
    );

    expect(getByTestId('review-root-insight')).toBeTruthy();
    expect(getByText(STRINGS.REVIEW_ROOT_INSIGHT_TITLE)).toBeTruthy();
    expect(getByText(explanation)).toBeTruthy();
    expect(getByLabelText(`${STRINGS.REVIEW_ROOT_INSIGHT_TITLE}. ${explanation}`)).toBeTruthy();
  });
});
