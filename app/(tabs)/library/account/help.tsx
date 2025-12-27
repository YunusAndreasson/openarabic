// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useMemo, type FC } from 'react';
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArabicColoringExamples } from '@/components/account/ArabicColoringExamples';
import { BaseCard } from '@/components/common';
import { type FAQCategoryData, type FAQItem } from '@/constants/faq';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { getFAQItemKey, useFAQSearch } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import { FAQCategory } from '@/types/enums';
import { parseTextWithEmails } from '@/utils/textUtils';

// Category icon mapping for visual categorization
const CATEGORY_ICONS: Record<FAQCategory, keyof typeof Ionicons.glyphMap> = {
  [FAQCategory.GETTING_STARTED]: 'rocket',
  [FAQCategory.FEATURES]: 'settings',
  [FAQCategory.OFFLINE_STORAGE]: 'cloud-offline',
  [FAQCategory.LEARNING_APPROACH]: 'school',
  [FAQCategory.PRIVACY_DATA]: 'lock-closed',
};

// FAQ item component props
interface FAQItemComponentProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onLayout?: (id: string, y: number) => void;
  uniqueKey: string; // Unique key for expand/collapse state (supports duplicate questions)
}

// Minimal, robust FAQ item component
const FAQItemComponent: FC<FAQItemComponentProps> = memo(
  ({ item, isExpanded, onToggle, onLayout, uniqueKey }) => {
    const colors = useColors();

    const handlePress = useCallback(() => {
      onToggle(uniqueKey);
    }, [uniqueKey, onToggle]);

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
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={answerContainerStyle}
          >
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
            {/* Render colored examples for Arabic text coloring FAQ */}
            {item.id === 'arabic-text-coloring' && <ArabicColoringExamples />}
          </Animated.View>
        )}
      </View>
    );
  },
);
FAQItemComponent.displayName = 'FAQItemComponent';

// FAQ Category Section component props
interface FAQCategorySectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: FAQItem[];
  expandedItems: Set<string>;
  onToggle: (id: string) => void;
  itemCount?: number;
  keyPrefix?: string; // Prefix for unique keys (e.g., 'popular' for popular questions)
  containerStyle?: ViewStyle;
}

// Reusable FAQ category section with header and items
// Handles both "Popular Questions" and regular category sections
const FAQCategorySection: FC<FAQCategorySectionProps> = memo(
  ({ title, icon, items, expandedItems, onToggle, itemCount, keyPrefix, containerStyle }) => {
    const colors = useColors();

    return (
      <View style={containerStyle}>
        <View style={styles.categoryHeader}>
          <Ionicons
            name={icon}
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.tint}
            style={styles.categoryIcon}
          />
          <ThemedText type="heading3" weight="semibold" style={styles.categoryTitle}>
            {title}
          </ThemedText>
          {itemCount !== undefined && (
            <ThemedText type="caption" colorName="textTertiary" style={styles.categoryCount}>
              ({itemCount})
            </ThemedText>
          )}
        </View>
        <View style={styles.categoryContainer}>
          {items.map(item => {
            const uniqueKey = getFAQItemKey(item.id, keyPrefix);
            return (
              <FAQItemComponent
                key={uniqueKey}
                uniqueKey={uniqueKey}
                isExpanded={expandedItems.has(uniqueKey)}
                item={item}
                onToggle={onToggle}
              />
            );
          })}
        </View>
      </View>
    );
  },
);
FAQCategorySection.displayName = 'FAQCategorySection';

// Main Help screen
const HelpScreen: FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ expandItem?: string }>();

  // FAQ search and state management
  const {
    searchQuery,
    setSearchQuery,
    clearSearch,
    expandedItems,
    handleToggleItem,
    filteredFAQData,
    totalResults,
    hasResults,
    showPopularQuestions,
    popularQuestions,
  } = useFAQSearch({ initialExpandedItem: params.expandItem });

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

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
          <Ionicons
            name="search"
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={colors.textTertiary}
            style={styles.searchIcon}
          />
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
            <Pressable
              onPress={handleClearSearch}
              style={styles.clearButton}
              hitSlop={LAYOUT.SPACING.SMALL}
            >
              {({ pressed }) => (
                <Ionicons
                  name="close-circle"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  color={colors.textTertiary}
                  style={{ opacity: pressed ? 0.6 : 1 }}
                />
              )}
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
          keyboardDismissMode: 'on-drag',
        }}
      >
        {!hasResults && searchQuery.trim() ? (
          // Empty state when no search results
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={LAYOUT.BUTTON.ICON_SIZE.XXLARGE}
              color={colors.textTertiary}
            />
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
              <FAQCategorySection
                title={STRINGS.HELP_POPULAR_QUESTIONS}
                icon="flame"
                items={popularQuestions}
                expandedItems={expandedItems}
                onToggle={handleToggleItem}
                keyPrefix="popular"
                containerStyle={styles.popularQuestionsSection}
              />
            )}

            {filteredFAQData.map((category: FAQCategoryData) => {
              const iconName = CATEGORY_ICONS[category.name as FAQCategory];
              const itemCount = category.items.length;

              // Skip categories without icons (defensive)
              if (!iconName) return null;

              return (
                <FAQCategorySection
                  key={category.name}
                  title={category.name}
                  icon={iconName}
                  items={category.items}
                  expandedItems={expandedItems}
                  onToggle={handleToggleItem}
                  itemCount={itemCount}
                />
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
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
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
