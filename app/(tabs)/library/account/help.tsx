// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { LayoutAnimation, type ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BaseCard } from '@/components/common/BaseCard';
import { SectionTitle } from '@/components/common/SectionTitle';
import { FAQ_DATA, type FAQCategoryData, type FAQItem } from '@/constants/faq';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

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
      if (LayoutAnimation && typeof LayoutAnimation.configureNext === 'function') {
        LayoutAnimation.configureNext({
          duration: 300,
          create: {
            type: LayoutAnimation.Types.spring,
            property: LayoutAnimation.Properties.opacity,
            springDamping: 0.8,
          },
          update: {
            type: LayoutAnimation.Types.spring,
            springDamping: 0.8,
          },
          delete: {
            type: LayoutAnimation.Types.spring,
            property: LayoutAnimation.Properties.opacity,
            springDamping: 0.8,
          },
        });
      }
      onToggle(item.id);
    }, [item.id, onToggle]);

    const handleLayout = useCallback(
      (event: { nativeEvent: { layout: { y: number } } }) => {
        if (onLayout) {
          onLayout(item.id, event.nativeEvent.layout.y);
        }
      },
      [item.id, onLayout]
    );

  const buttonStyle = useMemo(
    () => [
      styles.faqButton,
      {
        borderColor: isExpanded ? colors.tint : colors.cardBorder,
      },
    ],
    [colors.tint, colors.cardBorder, isExpanded]
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
    [colors.background, colors.cardBorder]
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
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={isExpanded ? colors.tint : colors.textTertiary}
            />
          </View>
        </BaseCard>
        {isExpanded && (
          <View style={answerContainerStyle}>
            <ThemedText type="body" colorName="metadataText">
              {item.answer}
            </ThemedText>
          </View>
        )}
      </View>
    );
  }
);
FAQItemComponent.displayName = 'FAQItemComponent';

// Main Help screen
const HelpScreen: FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ expandItem?: string }>();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const itemPositionsRef = useRef<Map<string, number>>(new Map());

  // Track item positions for scroll-to functionality
  const handleItemLayout = useCallback((id: string, y: number) => {
    itemPositionsRef.current.set(id, y);
  }, []);

  // Auto-expand item from URL params and scroll to it
  useEffect(() => {
    const itemToExpand = params.expandItem;
    if (!itemToExpand) return;

    setExpandedItems(prev => {
      const newSet = new Set(prev);
      newSet.add(itemToExpand);
      return newSet;
    });

    // Scroll to the expanded item after a short delay to allow for layout
    const scrollTimeout = setTimeout(() => {
      const itemY = itemPositionsRef.current.get(itemToExpand);
      if (itemY !== undefined && scrollViewRef.current) {
        // Scroll with offset to show the item near the top, accounting for header
        const scrollOffset = Math.max(0, itemY - LAYOUT.SPACING.LARGE);
        scrollViewRef.current.scrollTo({ y: scrollOffset, animated: true });
      }
    }, 350); // Slightly longer than LayoutAnimation duration (300ms)

    return () => clearTimeout(scrollTimeout);
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

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.flexOne}
        useSafeArea={false}
        scrollViewRef={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContentDynamic,
          {
            paddingTop: LAYOUT.SPACING.LARGE,
            paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: true,
          removeClippedSubviews: false,
        }}
      >
        {FAQ_DATA.map((category: FAQCategoryData, categoryIndex) => (
          <View
            key={category.name}
            style={categoryIndex > 0 ? styles.categorySpacingConditional : undefined}
          >
            <SectionTitle title={category.name} isFirstSection={categoryIndex === 0} />
            <View style={styles.categoryContainer}>
              {category.items.map(item => (
                <FAQItemComponent
                  key={item.id}
                  isExpanded={expandedItems.has(item.id)}
                  item={item}
                  onToggle={handleToggleItem}
                  onLayout={handleItemLayout}
                />
              ))}
            </View>
          </View>
        ))}
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
  categorySpacingConditional: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
  // FAQ Item styles moved from inline for better performance
  faqItemContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
});

export default HelpScreen;
