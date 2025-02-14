import { Image, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { articlesService } from '../../services/articles';
import type { Database } from '../../types/database.types';

type Article = Database['public']['Tables']['articles']['Row'];

export default function HomeScreen() {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await articlesService.getArticles();
        setArticles(data || []);
      } catch (error) {
        throw error;
      }
    };

    fetchArticles();
  }, []);

  return (
    <ParallaxScrollView
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <View>
        {articles.map(article => (
          <ThemedText key={article.id}>{article.title}</ThemedText>
        ))}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
