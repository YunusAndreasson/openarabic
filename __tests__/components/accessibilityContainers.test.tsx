/**
 * Containers must not swallow the controls inside them.
 *
 * On iOS an element marked accessible becomes ONE VoiceOver stop and its
 * children stop being reachable. A Pressable is accessible by default, and so
 * is gorhom's bottom-sheet content wrapper — which made every app sheet and
 * every tutorial a single, unusable element for screen-reader users.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

import { TutorialOverlay } from '@/components/tutorials/TutorialOverlay';
import { BrandedBottomSheet } from '@/components/ui/BrandedBottomSheet';

describe('accessibility containers', () => {
  test('the tutorial overlay leaves its controls individually reachable', () => {
    const { UNSAFE_getAllByType, getByText } = render(
      <TutorialOverlay visible onDismiss={jest.fn()}>
        <Text>Next</Text>
      </TutorialOverlay>,
    );

    expect(getByText('Next')).toBeTruthy();
    const pressables = UNSAFE_getAllByType(Pressable);
    expect(pressables.length).toBeGreaterThan(0);
    for (const pressable of pressables) {
      expect(pressable.props.accessible).toBe(false);
    }
  });

  test('a branded bottom sheet does not group its content into one element', () => {
    const { UNSAFE_getByProps } = render(
      <BrandedBottomSheet isVisible onClose={jest.fn()}>
        <Text>Add to practice</Text>
      </BrandedBottomSheet>,
    );

    expect(UNSAFE_getByProps({ accessible: false, index: -1 })).toBeTruthy();
  });
});
