import type { Tables } from './database.types';

export type Article = Tables<'articles'> & {
  category: Tables<'categories'> | null;
  author: Tables<'authors'> | null;
  article_sentences: Tables<'article_sentences'>[];
  audio_url: string | null;
};

export type ArticleCardProps = {
  article: Article;
  onPress?: (article: Article) => void;
};
