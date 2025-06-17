import { jest, test } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { measureRenders } from 'reassure';

import ArticleCard from '@/components/ArticleCard';

test('ArticleCard render performance', async () => {
  const scenario = async () => {
    fireEvent.press(screen.getByTestId('card'));
  };

  await measureRenders(
    <ArticleCard
      author="John Doe"
      category="science"
      categoryForDisplay="Science"
      imageUrl="https://example.com/image.jpg"
      summary="short summary"
      title="Sample Article"
      onPress={jest.fn()}
      testID="card"
    />,
    { scenario, runs: 5 }
  );
});
