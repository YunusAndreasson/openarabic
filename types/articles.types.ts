import type { Tables } from './database.types';

export type ArticleSentence = Tables<'article_sentences'> & {
  sentence_words: (Tables<'sentence_words'> & {
    root: Tables<'roots'>;
    word_type: Tables<'word_types'>;
  })[];
};

export type Article = Tables<'articles'> & {
  category: Tables<'categories'> | null;
  author: Tables<'authors'> | null;
  article_sentences: ArticleSentence[];
  audio_url: string | null;
};

export type ArticleCardProps = {
  article: Article;
  onPress?: (article: Article) => void;
};
