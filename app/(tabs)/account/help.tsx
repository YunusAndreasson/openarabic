// External Libraries
import { Icon } from '@/components/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { KEYBOARD_AWARE_SCROLL_PROPS, ThemedView } from '@/components/primitives/ThemedView';
import { ThemedInput } from '@/components/primitives/ThemedInput';
import { ArabicColoringExamples } from '@/components/account/ArabicColoringExamples';
import { BaseCard, EmptyState, SectionLabel } from '@/components/common';
import { type FAQCategoryData, type FAQItem } from '@/constants/faq';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useFAQSearch } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import { parseTextWithEmails } from '@/utils/textUtils';

// FAQ item component props
interface FAQItemComponentProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

// Minimal, robust FAQ item component
const FAQItemComponent = memo(({ item, isExpanded, onToggle }: FAQItemComponentProps) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  // No strokes, and one signal for "open". Cards separate by elevation, so the
  // question and the answer carry no border; and the chevron alone says the
  // item is open — it used to be said three times over, by a tint border,
  // tint question text and a tint chevron. The surface, radius and elevation
  // all come from BaseCard.
  return (
    <View>
      <BaseCard
        contentStyle={styles.faqButton}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={item.question}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.faqButtonContent}>
          <ThemedText type="body" style={styles.faqQuestionText}>
            {item.question}
          </ThemedText>
          <Icon
            accessible={false}
            importantForAccessibility="no"
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.textTertiary}
          />
        </View>
      </BaseCard>
      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <BaseCard
            elevation="hairline"
            style={styles.faqAnswerContainer}
            contentStyle={styles.faqAnswerContent}
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
          </BaseCard>
        </Animated.View>
      )}
    </View>
  );
});
FAQItemComponent.displayName = 'FAQItemComponent';

// FAQ Category Section component props
interface FAQCategorySectionProps {
  title: string;
  items: FAQItem[];
  expandedItems: Set<string>;
  onToggle: (id: string) => void;
}

// Reusable FAQ category section with header and items. Each question appears
// once on the screen, so its id is its key and its expanded-state key.
const FAQCategorySection = memo(
  ({ title, items, expandedItems, onToggle }: FAQCategorySectionProps) => {
    return (
      <Fragment>
        <SectionLabel title={title} />
        <View style={styles.categoryContainer}>
          {items.map(item => (
            <FAQItemComponent
              key={item.id}
              isExpanded={expandedItems.has(item.id)}
              item={item}
              onToggle={onToggle}
            />
          ))}
        </View>
      </Fragment>
    );
  },
);
FAQCategorySection.displayName = 'FAQCategorySection';

// Main Help screen
const HelpScreen = () => {
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
  } = useFAQSearch({ initialExpandedItem: params.expandItem });

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const handleContactSupport = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FEEDBACK);
  }, []);

  const showEmptyState = !hasResults && Boolean(searchQuery.trim());

  return (
    <ThemedView safeAreaEdges={['left', 'right', 'bottom']} style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <ThemedInput
          icon="search"
          accessibilityLabel={STRINGS.HELP_SEARCH_PLACEHOLDER}
          placeholder={STRINGS.HELP_SEARCH_PLACEHOLDER}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          {...(searchQuery.length > 0
            ? {
                rightIcon: 'close-circle' as const,
                rightIconAccessibilityLabel: STRINGS.HELP_SEARCH_CLEAR,
                onRightIconPress: handleClearSearch,
              }
            : { rightIcon: undefined, rightIconAccessibilityLabel: undefined })}
        />
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
          ...KEYBOARD_AWARE_SCROLL_PROPS,
          showsVerticalScrollIndicator: true,
          removeClippedSubviews: false,
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
            <BaseCard style={styles.helpFooter}>
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
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  resultCount: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  // Lets the shared EmptyState center itself within the scroll viewport
  scrollContentEmpty: {
    flexGrow: 1,
  },
  // BaseCard supplies the radius and the surface; this is only its padding.
  faqButton: {
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
  // BaseCard supplies the radius and the surface; this is only the panel's
  // offset from the question above it.
  faqAnswerContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  faqAnswerContent: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
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
