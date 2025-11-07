// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BaseCard } from '@/components/common';
import { getFAQExpandAnimation } from '@/constants/animation';
import { FAQ_DATA, type FAQCategoryData, type FAQItem } from '@/constants/faq';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { FAQCategory } from '@/types/enums';
import { useColors } from '@/hooks/theme/useColors';
import { parseTextWithEmails } from '@/utils/textUtils';

// Category icon mapping for visual categorization
const CATEGORY_ICONS: Record<FAQCategory, keyof typeof Ionicons.glyphMap> = {
  [FAQCategory.GETTING_STARTED]: 'rocket',
  [FAQCategory.FEATURES]: 'settings',
  [FAQCategory.OFFLINE_STORAGE]: 'cloud-offline',
  [FAQCategory.LEARNING_APPROACH]: 'school',
  [FAQCategory.PRIVACY_DATA]: 'lock-closed',
};

// Popular questions (most common user queries)
const POPULAR_QUESTION_IDS = ['what-is-app', 'spaced-repetition', 'learning-speed'] as const;

// FAQ item component props
interface FAQItemComponentProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onLayout?: (id: string, y: number) => void;
}

// Minimal, robust FAQ item component
const FAQItemComponent: FC<FAQItemComponentProps> = memo(
  ({ item, isExpanded, onToggle, onLayout }) => {
    const colors = useColors();

    const handlePress = useCallback(() => {
      // Use spring-based LayoutAnimation for natural expand/collapse feel
      const animationConfig = getFAQExpandAnimation();
      if (
        animationConfig &&
        LayoutAnimation &&
        typeof LayoutAnimation.configureNext === 'function'
      ) {
        LayoutAnimation.configureNext(animationConfig);
      }
      onToggle(item.id);
    }, [item.id, onToggle]);

    const handleLayout = useCallback(
      (event: { nativeEvent: { layout: { y: number } } }) => {
        if (onLayout) {
          onLayout(item.id, event.nativeEvent.layout.y);
        }
      },
      [item.id, onLayout],
    );

    const buttonStyle = useMemo(
      () => [
        styles.faqButton,
        {
          borderColor: isExpanded ? colors.tint : colors.cardBorder,
        },
      ],
      [colors.tint, colors.cardBorder, isExpanded],
    );

    const answerContainerStyle = useMemo(
      () => [
        styles.faqAnswerContainer,
        {
          backgroundColor: colors.background,
          borderColor: colors.cardBorder,
          ...LAYOUT.ELEVATION.SUBTLE, // Consistent elevation for expanded content
        },
      ],
      [colors.background, colors.cardBorder],
    );

    return (
      <View style={styles.faqItemContainer} onLayout={handleLayout}>
        <BaseCard shadowSize="small" style={buttonStyle} onPress={handlePress}>
          <View style={styles.faqButtonContent}>
            <ThemedText
              type="body"
              weight="medium"
              colorName={isExpanded ? 'tint' : 'text'}
              style={styles.faqQuestionText}
            >
              {item.question}
            </ThemedText>
            <Ionicons
              name={isExpanded ? 'remove-circle' : 'add-circle'}
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={isExpanded ? colors.tint : colors.textTertiary}
            />
          </View>
        </BaseCard>
        {isExpanded && (
          <View style={answerContainerStyle}>
            {item.answer.split('\n\n').map((paragraph, index) => (
              <ThemedText
                // eslint-disable-next-line react/no-array-index-key
                key={`${item.id}-paragraph-${index}`}
                type="body"
                colorName="metadataText"
                style={index > 0 ? styles.paragraphSpacing : undefined}
              >
                {parseTextWithEmails(paragraph, 'body')}
              </ThemedText>
            ))}
          </View>
        )}
      </View>
    );
  },
);
FAQItemComponent.displayName = 'FAQItemComponent';

// Main Help screen
const HelpScreen: FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ expandItem?: string }>();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-expand item from URL params
  useEffect(() => {
    const itemToExpand = params.expandItem;
    if (!itemToExpand) return;

    setExpandedItems(prev => {
      const newSet = new Set(prev);
      newSet.add(itemToExpand);
      return newSet;
    });
  }, [params.expandItem]);

  const handleToggleItem = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Filter FAQ based on search query
  const filteredFAQData = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_DATA;

    const query = searchQuery.toLowerCase().trim();
    return FAQ_DATA.map(category => ({
      ...category,
      items: category.items.filter(
        item =>
          item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query),
      ),
    })).filter(category => category.items.length > 0);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const totalResults = useMemo(
    () => filteredFAQData.reduce((sum, category) => sum + category.items.length, 0),
    [filteredFAQData],
  );

  const hasResults = totalResults > 0;

  // Get popular questions for quick access
  const popularQuestions = useMemo(() => {
    const allQuestions = FAQ_DATA.flatMap(category => category.items);
    return POPULAR_QUESTION_IDS.map(id => allQuestions.find(q => q.id === id)).filter(
      Boolean,
    ) as FAQItem[];
  }, []);

  // Only show popular questions when not searching
  const showPopularQuestions = !searchQuery.trim();

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.searchInputContainer,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={STRINGS.HELP_SEARCH_PLACEHOLDER}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={handleClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        {searchQuery.trim() && (
          <ThemedText type="caption" colorName="textTertiary" style={styles.resultCount}>
            {totalResults}{' '}
            {totalResults === 1
              ? STRINGS.HELP_SEARCH_RESULTS_SINGULAR
              : STRINGS.HELP_SEARCH_RESULTS_PLURAL}
          </ThemedText>
        )}
      </View>

      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.flexOne}
        useSafeArea={false}
        contentContainerStyle={[
          styles.scrollContentDynamic,
          {
            paddingTop: LAYOUT.SPACING.MEDIUM,
            paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: true,
          removeClippedSubviews: false,
          keyboardShouldPersistTaps: 'handled',
        }}
      >
        {!hasResults && searchQuery.trim() ? (
          // Empty state when no search results
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={colors.textTertiary} />
            <ThemedText type="heading3" weight="semibold" style={styles.emptyStateTitle}>
              {STRINGS.HELP_NO_RESULTS_TITLE}
            </ThemedText>
            <ThemedText type="body" colorName="textTertiary" style={styles.emptyStateDescription}>
              {STRINGS.HELP_NO_RESULTS_DESCRIPTION}
            </ThemedText>
          </View>
        ) : (
          <>
            {/* Popular Questions Section */}
            {showPopularQuestions && popularQuestions.length > 0 && (
              <View style={styles.popularQuestionsSection}>
                <View style={styles.categoryHeader}>
                  <Ionicons
                    name="flame"
                    size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                    color={colors.tint}
                    style={styles.categoryIcon}
                  />
                  <ThemedText type="heading3" weight="semibold" style={styles.categoryTitle}>
                    {STRINGS.HELP_POPULAR_QUESTIONS}
                  </ThemedText>
                </View>
                <View style={styles.categoryContainer}>
                  {popularQuestions.map(item => (
                    <FAQItemComponent
                      key={item.id}
                      isExpanded={expandedItems.has(item.id)}
                      item={item}
                      onToggle={handleToggleItem}
                    />
                  ))}
                </View>
              </View>
            )}

            {filteredFAQData.map((category: FAQCategoryData) => {
              const iconName = CATEGORY_ICONS[category.name as FAQCategory];
              const itemCount = category.items.length;

              return (
                <View key={category.name}>
                  <View style={styles.categoryHeader}>
                    {iconName && (
                      <Ionicons
                        name={iconName}
                        size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                        color={colors.tint}
                        style={styles.categoryIcon}
                      />
                    )}
                    <ThemedText type="heading3" weight="semibold" style={styles.categoryTitle}>
                      {category.name}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      colorName="textTertiary"
                      style={styles.categoryCount}
                    >
                      ({itemCount})
                    </ThemedText>
                  </View>
                  <View style={styles.categoryContainer}>
                    {category.items.map(item => (
                      <FAQItemComponent
                        key={item.id}
                        isExpanded={expandedItems.has(item.id)}
                        item={item}
                        onToggle={handleToggleItem}
                      />
                    ))}
                  </View>
                </View>
              );
            })}

            {/* Still Need Help? Footer */}
            <BaseCard shadowSize="small" style={styles.helpFooter}>
              <View style={styles.helpFooterContent}>
                <ThemedText type="body" weight="semibold" style={styles.helpFooterTitle}>
                  {STRINGS.HELP_STILL_NEED_HELP_TITLE}
                </ThemedText>
                <ThemedText
                  type="body"
                  colorName="textTertiary"
                  style={styles.helpFooterDescription}
                >
                  {STRINGS.HELP_STILL_NEED_HELP_DESCRIPTION}
                </ThemedText>
                <ThemedButton
                  title={STRINGS.CONTACT_SUPPORT}
                  onPress={() => router.push(ROUTE_PATHS.ACCOUNT_FEEDBACK)}
                  style={styles.helpFooterButton}
                />
              </View>
            </BaseCard>
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollContentDynamic: LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  categoryIcon: {
    marginRight: -LAYOUT.SPACING.TINY, // Tighten spacing slightly
  },
  categoryTitle: {
    flex: 1,
  },
  categoryCount: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
  popularQuestionsSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  // Search bar styles
  searchContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    height: 44,
  },
  searchIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  searchInput: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  clearButton: {
    padding: LAYOUT.SPACING.TINY,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  resultCount: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE * 2,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  emptyStateTitle: {
    textAlign: 'center',
  },
  emptyStateDescription: {
    textAlign: 'center',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  // FAQ Item styles moved from inline for better performance
  faqItemContainer: {
    // Spacing handled by parent container's gap property
  },
  faqButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE, // 48dp minimum per Fitts' Law
  },
  faqButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestionText: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  faqAnswerContainer: {
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  paragraphSpacing: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  // Still Need Help? footer styles
  helpFooter: {
    marginTop: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  helpFooterContent: {
    gap: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  helpFooterTitle: {
    textAlign: 'center',
  },
  helpFooterDescription: {
    textAlign: 'center',
  },
  helpFooterButton: {
    marginTop: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
});

export default HelpScreen;
