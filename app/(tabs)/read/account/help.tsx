// External Libraries
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useState, type FC } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SectionTitle from '@common/SectionTitle';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FAQ_DATA, type FAQItem } from '@/constants/faq';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

// FAQ item component props
interface FAQItemComponentProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

// Minimal, robust FAQ item component
const FAQItemComponent: FC<FAQItemComponentProps> = memo(({ item, isExpanded, onToggle }) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <View style={{ marginBottom: LAYOUT.SPACING.MEDIUM }}>
      <Pressable
        style={{
          backgroundColor: colors.card,
          borderColor: isExpanded ? colors.tint : colors.cardBorder,
          borderWidth: LAYOUT.BORDER.WIDTH.THIN,
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          paddingHorizontal: LAYOUT.SPACING.LARGE,
          paddingVertical: LAYOUT.SPACING.MEDIUM,
          minHeight: LAYOUT.BUTTON.HEIGHT.LARGE, // 48dp minimum per Fitts' Law
          ...LAYOUT.ELEVATION.SUBTLE, // Consistent elevation
        }}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={item.question}
        accessibilityHint={isExpanded ? 'Collapses the answer' : 'Expands to show the answer'}
        android_ripple={{
          color: colors.navigationRipple,
          borderless: false,
          radius: LAYOUT.BUTTON.HEIGHT.LARGE / 2,
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <ThemedText
            type="body"
            weight="medium"
            colorName={isExpanded ? 'tint' : 'text'}
            style={{ flex: 1, marginRight: LAYOUT.SPACING.MEDIUM }}
          >
            {item.question}
          </ThemedText>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={isExpanded ? colors.tint : colors.textTertiary}
          />
        </View>
      </Pressable>
      {isExpanded && (
        <View
          style={{
            backgroundColor: colors.background,
            borderColor: colors.cardBorder,
            borderWidth: LAYOUT.BORDER.WIDTH.THIN,
            borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
            paddingHorizontal: LAYOUT.SPACING.LARGE,
            paddingVertical: LAYOUT.SPACING.MEDIUM,
            marginTop: LAYOUT.SPACING.SMALL,
            ...LAYOUT.ELEVATION.SUBTLE, // Consistent elevation for expanded content
          }}
        >
          <ThemedText type="body" variant="secondary">
            {item.answer}
          </ThemedText>
        </View>
      )}
    </View>
  );
});
FAQItemComponent.displayName = 'FAQItemComponent';

// Main Help screen
const HelpScreen: FC = () => {
  const insets = useSafeAreaInsets();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: LAYOUT.SPACING.LARGE,
            paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
          removeClippedSubviews: false,
        }}
      >
        {FAQ_DATA.map((category, categoryIndex) => (
          <View key={category.name} style={categoryIndex > 0 ? styles.categorySpacing : undefined}>
            <SectionTitle title={category.name} isFirstSection={categoryIndex === 0} />
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
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  scrollView: {
    flex: 1,
  },
  categoryContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
  categorySpacing: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
});

export default HelpScreen;
