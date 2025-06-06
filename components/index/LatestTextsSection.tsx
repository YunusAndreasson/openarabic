import { JSX, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import SectionTitle from '@/components/SectionTitle';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';

import ArticleItem from './ArticleItem';

const styles = StyleSheet.create({
  sectionContainer: {
    // Removed margins - SectionTitle handles all section spacing
  },
});

interface LatestTextsSectionProps {
  articles: Article[];
  onArticlePress: (article: Article) => void;
}

const LatestTextsSection = memo(
  ({ articles, onArticlePress }: LatestTextsSectionProps): JSX.Element => {
    return (
      <View style={styles.sectionContainer}>
        <SectionTitle title="Latest" />
        {articles.map((article, index) => (
          <ArticleItem
            key={article.id}
            article={article}
            onPress={onArticlePress}
            isLast={index === articles.length - 1}
          />
        ))}
      </View>
    );
  }
);

LatestTextsSection.displayName = 'LatestTextsSection';

export default LatestTextsSection;
