import { JSX, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import SectionTitle from '@/components/SectionTitle';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';

import ArticleItem from './ArticleItem';

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
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
        <SectionTitle title="Latest Texts" />
        {articles.map(article => (
          <ArticleItem key={article.id} article={article} onPress={onArticlePress} />
        ))}
      </View>
    );
  }
);

LatestTextsSection.displayName = 'LatestTextsSection';

export default LatestTextsSection;
