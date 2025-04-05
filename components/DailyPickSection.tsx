<ThemedCard
  variant="article"
  imageUrl={article.image_url || 'https://picsum.photos/800/400'}
  title={article.title}
  category="DAILY PICK"
  author={article.author?.name || 'Unknown'}
  summary={article.summary || undefined}
  onPress={handlePress}
  style={styles.cardStyle}
/>;
