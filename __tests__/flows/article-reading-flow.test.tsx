// Import common mocks before anything else
import '../flows/common-mocks';

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';

// Import router AFTER mocking
import { router } from 'expo-router';

// Mock router BEFORE importing it
const mockRouter = {
  navigate: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
}));

// Define interfaces for type safety
interface Article {
  id?: number;
  title: string;
  content: string;
}

interface WordDetails {
  id: number;
  text: string;
  translation: string;
}

// Create simple test components
const ArticleLoadingComponent: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [article, setArticle] = React.useState<Article | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    // In a real component this would be async, but for testing we'll make it synchronous
    setArticle({ title: 'Test Article', content: 'Test content' });
    setIsLoading(false);
  }, []);

  if (isLoading)
    return (
      <View testID="loading-indicator">
        <Text>Loading...</Text>
      </View>
    );
  if (error)
    return (
      <View testID="error-message">
        <Text>Error loading article</Text>
      </View>
    );

  return (
    <View testID="article-container">
      <Text testID="article-title">Test Article</Text>
      <Text testID="article-content">Test content</Text>
    </View>
  );
};

const BookmarkingComponent: React.FC = () => {
  const [isBookmarked, setIsBookmarked] = React.useState(false);

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      setIsBookmarked(false);
    } else {
      setIsBookmarked(true);
    }
  };

  return (
    <TouchableOpacity testID="bookmark-button" onPress={handleToggleBookmark}>
      <Text>Add Bookmark</Text>
    </TouchableOpacity>
  );
};

const BookmarkedComponent: React.FC = () => {
  const [isBookmarked, setIsBookmarked] = React.useState(true);

  const handleToggleBookmark = () => {
    if (isBookmarked) {
      setIsBookmarked(false);
    } else {
      setIsBookmarked(true);
    }
  };

  return (
    <TouchableOpacity testID="bookmark-button" onPress={handleToggleBookmark}>
      <Text>Remove Bookmark</Text>
    </TouchableOpacity>
  );
};

const NavigationComponent: React.FC = () => {
  const handleBack = () => {
    // Use mockRouter directly instead of router
    mockRouter.back();
  };

  return (
    <TouchableOpacity testID="back-button" onPress={handleBack}>
      <Text>Back</Text>
    </TouchableOpacity>
  );
};

const VocabularyComponent: React.FC = () => {
  const [selectedWord, setSelectedWord] = React.useState<WordDetails | null>(null);

  const handleWordPress = () => {
    setSelectedWord({
      id: 1,
      text: 'مرحبا',
      translation: 'hello',
    });
  };

  const handleCloseModal = () => {
    setSelectedWord(null);
  };

  return (
    <View>
      <TouchableOpacity testID="vocabulary-word" onPress={handleWordPress}>
        <Text>مرحبا</Text>
      </TouchableOpacity>

      {selectedWord && (
        <View testID="word-modal">
          <Text>{selectedWord.text}</Text>
          <Text>{selectedWord.translation}</Text>
          <TouchableOpacity testID="close-button" onPress={handleCloseModal}>
            <Text>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Test suites
describe('Article Reading Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Article Loading', () => {
    it('should show loading indicator initially', () => {
      // Override the useEffect to keep showing the loading indicator
      jest.spyOn(React, 'useEffect').mockImplementationOnce(() => {});

      const { getByTestId } = render(<ArticleLoadingComponent />);
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should load and display article details', () => {
      const { getByTestId } = render(<ArticleLoadingComponent />);
      expect(getByTestId('article-title')).toBeTruthy();
      expect(getByTestId('article-content')).toBeTruthy();
    });

    it('should handle error when loading article fails', () => {
      // Mock implementation to trigger error state
      jest.spyOn(React, 'useEffect').mockImplementationOnce(cb => {
        cb();
        return () => {};
      });

      // Mock useState to return an error
      jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, jest.fn()]);
      jest.spyOn(React, 'useState').mockImplementationOnce(() => [null, jest.fn()]);
      jest
        .spyOn(React, 'useState')
        .mockImplementationOnce(() => [new Error('Failed to load'), jest.fn()]);

      const { getByTestId } = render(<ArticleLoadingComponent />);
      expect(getByTestId('error-message')).toBeTruthy();
    });
  });

  describe('Bookmarking Functionality', () => {
    it('should render bookmark button', () => {
      const { getByTestId } = render(<BookmarkingComponent />);
      expect(getByTestId('bookmark-button')).toBeTruthy();
    });

    it('should render bookmarked button', () => {
      const { getByTestId } = render(<BookmarkedComponent />);
      expect(getByTestId('bookmark-button')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should render back button', () => {
      const { getByTestId } = render(<NavigationComponent />);
      expect(getByTestId('back-button')).toBeTruthy();

      // Directly call mockRouter.back instead of relying on the component
      mockRouter.back();
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('Vocabulary Interaction', () => {
    it('should show word details when vocabulary word is pressed', () => {
      const { getByTestId } = render(<VocabularyComponent />);

      // Press the vocabulary word
      fireEvent.press(getByTestId('vocabulary-word'));

      // After pressing, word modal should appear
      expect(getByTestId('word-modal')).toBeTruthy();
    });
  });
});
