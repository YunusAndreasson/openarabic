// External Libraries
import { Ionicons } from '@/components/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, memo, useCallback, useMemo, type FC } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArabicColoringExamples } from '@/components/account/ArabicColoringExamples';
import { BaseCard, EmptyState, SectionLabel } from '@/components/common';
import { type FAQCategoryData, type FAQItem } from '@/constants/faq';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { getFAQItemKey, useFAQSearch } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import { parseTextWithEmails } from '@/utils/textUtils';

// FAQ item component props
interface FAQItemComponentProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  uniqueKey: string; // Unique key for expand/collapse state (supports duplicate questions)
}

// Minimal, robust FAQ item component
const FAQItemComponent: FC<FAQItemComponentProps> = memo(
  ({ item, isExpanded, onToggle, uniqueKey }) => {
    const colors = useColors();

    const handlePress = useCallback(() => {
      onToggle(uniqueKey);
    }, [uniqueKey, onToggle]);

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
      <View>
        <BaseCard shadowSize="small" style={buttonStyle} onPress={handlePress}>
          <View style={styles.faqButtonContent}>
            <ThemedText
              type="body"
              colorName={isExpanded ? 'tint' : 'text'}
              style={styles.faqQuestionText}
            >
              {item.question}
            </ThemedText>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
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
  items: FAQItem[];
  expandedItems: Set<string>;
  onToggle: (id: string) => void;
  keyPrefix?: string; // Prefix for unique keys (e.g., 'popular' for popular questions)
}

// Reusable FAQ category section with header and items
const FAQCategorySection: FC<FAQCategorySectionProps> = memo(
  ({ title, items, expandedItems, onToggle, keyPrefix }) => {
    return (
      <Fragment>
        <SectionLabel title={title} />
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
      </Fragment>
    );
  },
);
FAQCategorySection.displayName = 'FAQCategorySection';

// Main Help screen
const HelpScreen: FC = () => {
  const colors = useColors();
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

  const handleContactSupport = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FEEDBACK);
  }, []);

  const showEmptyState = !hasResults && Boolean(searchQuery.trim());

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
              accessibilityRole="button"
              accessibilityLabel={STRINGS.HELP_SEARCH_CLEAR}
              onPress={handleClearSearch}
              style={styles.clearButton}
              hitSlop={LAYOUT.HIT_SLOP.SMALL}
            >
              {({ pressed }) => (
                <Ionicons
                  name="close-circle"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  color={colors.textTertiary}
                  style={{ opacity: pressed ? LAYOUT.OPACITY.PRESSED : LAYOUT.OPACITY.FULL }}
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
        contentContainerStyle={
          showEmptyState ? [styles.scrollContent, styles.scrollContentEmpty] : styles.scrollContent
        }
        scrollViewProps={{
          showsVerticalScrollIndicator: true,
          removeClippedSubviews: false,
          keyboardShouldPersistTaps: 'handled',
          keyboardDismissMode: 'on-drag',
        }}
      >
        {showEmptyState ? (
          // Empty state when no search results
          <EmptyState
            icon="search-outline"
            title={STRINGS.HELP_NO_RESULTS_TITLE}
            hint={STRINGS.HELP_NO_RESULTS_DESCRIPTION}
          />
        ) : (
          <>
            {/* Popular Questions Section */}
            {showPopularQuestions && popularQuestions.length > 0 && (
              <FAQCategorySection
                title={STRINGS.HELP_POPULAR_QUESTIONS}
                items={popularQuestions}
                expandedItems={expandedItems}
                onToggle={handleToggleItem}
                keyPrefix="popular"
              />
            )}

            {filteredFAQData.map((category: FAQCategoryData) => (
              <FAQCategorySection
                key={category.name}
                title={category.name}
                items={category.items}
                expandedItems={expandedItems}
                onToggle={handleToggleItem}
              />
            ))}

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
                  onPress={handleContactSupport}
                  fullWidth
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
  scrollContent: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  categoryContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
  // Search bar styles
  searchContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
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
  // Lets the shared EmptyState center itself within the scroll viewport
  scrollContentEmpty: {
    flexGrow: 1,
  },
  faqButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
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
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
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
});

export default HelpScreen;
