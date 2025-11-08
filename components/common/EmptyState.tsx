import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ListenListItemCard } from '@/components/bookmarks';
import { LAYOUT } from '@/constants/layout';

import { ListSeparator } from './ListSeparator';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';
import { formatAuthorCategory } from '@/utils/stringUtils';

// Define EmptyStateProps inline
interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  icon?: string; // Simplified: only string icon names
  onAction?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  submessage?: string;
  customActionButton?: ReactNode;
  iconSize?: number;
  hideArticlesButton?: boolean;
  // Recommended articles - 2025 best practice: show content, not just buttons
  recommendedArticles?: Article[];
  onArticlePress?: (article: Article) => void;
}

const DEFAULT_ICON_SIZE = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE;

function handleBrowseArticles(): void {
  router.push(ROUTE_PATHS.EXPLORE_TAB);
}

/**
 * EmptyState component following Gestalt principles and visual hierarchy
 *
 * Typography Hierarchy:
 * - Title: heading3 (17px, semibold) - Primary message
 * - Description: body (15px, regular) - Supporting explanation
 *
 * Gestalt Principles:
 * - Proximity: Title+description closer (8px), larger gap before content (24px)
 * - Similarity: Consistent card styling for recommended articles
 * - Figure-Ground: Centered content, clear separation between sections
 * - Continuation: Natural flow from icon → title → description → article cards
 * - Simplicity: Content speaks for itself without unnecessary labels
 */
export function EmptyState({
  title,
  description,
  actionText,
  icon,
  onAction,
  containerStyle,
  submessage,
  customActionButton,
  iconSize = DEFAULT_ICON_SIZE,
  hideArticlesButton = false,
  recommendedArticles,
  onArticlePress,
}: EmptyStateProps) {
  const colors = useColors(); // Source colors internally

  // 2025 best practice: Show recommended articles if available
  const hasRecommendations = recommendedArticles && recommendedArticles.length > 0;

  const defaultActionButton = !hideArticlesButton && !hasRecommendations && (
    <ThemedButton
      style={styles.customActionButton}
      title={STRINGS.BROWSE_ARTICLES}
      onPress={handleBrowseArticles}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.contentContainer}>
        {icon && (
          <View style={styles.iconContainer}>
            <Ionicons
              color={colors.tint}
              name={icon as ComponentProps<typeof Ionicons>['name']}
              size={iconSize}
              style={styles.icon}
            />
          </View>
        )}

        <View style={styles.textContent}>
          <ThemedText align="center" style={styles.title} type="heading3">
            {title}
          </ThemedText>

          {description && (
            <ThemedText align="center" style={styles.description} type="body" variant="secondary">
              {description}
            </ThemedText>
          )}

          {submessage && (
            <ThemedText align="center" style={styles.submessage} type="body" variant="subtle">
              {submessage}
            </ThemedText>
          )}
        </View>
      </View>

      <View style={styles.actionArea}>
        {hasRecommendations ? (
          <View style={styles.recommendationsContainer}>
            {recommendedArticles.map((article, index) => (
              <View key={article.id}>
                <ListenListItemCard
                  title={article.title}
                  secondaryText={formatAuthorCategory(article.author.name, article.category.name)}
                  imageUrl={generateImageUrl(article.image_url)}
                  articleId={article.id}
                  onPress={() => onArticlePress?.(article)}
                  shouldAnimateOnMount={false}
                />
                {index < recommendedArticles.length - 1 && (
                  <ListSeparator height={LAYOUT.SPACING.SMALL} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <>
            {customActionButton ||
              defaultActionButton ||
              (actionText && onAction && (
                <ThemedButton
                  icon={icon}
                  style={styles.customActionButton}
                  title={actionText}
                  onPress={onAction}
                />
              ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionArea: {
    marginTop: LAYOUT.SPACING.XLARGE, // Increased from MEDIUM to create clear separation
    width: '100%',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  contentContainer: {
    alignItems: 'center',
    maxWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 7 - LAYOUT.SPACING.LARGE,
  },
  customActionButton: {
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 4 - LAYOUT.SPACING.MEDIUM,
  },
  description: {
    marginTop: LAYOUT.SPACING.SMALL, // Reduced from MEDIUM - title+description are one unit
  },
  icon: {},
  iconContainer: {
    alignItems: 'center',
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 2,
  },
  recommendationsContainer: {
    width: '100%',
  },
  submessage: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  textContent: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  title: {
    // No custom letterSpacing needed - heading3 has proper spacing
  },
});
