import { WidgetSettingsEntry } from '@/components/widget/WidgetOffer';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Pressable, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { articleQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { loadFirstPage } from '@/services/firstPage';
import { getArticleRoute } from '@/utils/routeBuilders';

export function ContinueFirstPage() {
  const page = loadFirstPage();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: colors.elevation1, borderColor: colors.cardBorder }]}
      onPress={() => router.push(ROUTE_PATHS.FIRST_PAGE)}
    >
      <ThemedText type="heading3">{STRINGS.CONTINUE_READING}</ThemedText>
      <ThemedText type="bodyBold" colorName="tint">
        {page.title}
      </ThemedText>
      <ThemedText type="caption">
        {page.author} · {page.category}
      </ThemedText>
    </Pressable>
  );
}

export function PublicTexts() {
  const catalog = useQuery(articleQueries.all());
  const colors = useColors();
  return (
    <FlashList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      data={catalog.data ?? []}
      keyExtractor={item => String(item.id)}
      ListHeaderComponent={<ContinueFirstPage />}
      ListFooterComponent={<WidgetSettingsEntry guest />}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          style={[styles.row, { borderColor: colors.border }]}
          onPress={() => router.push(getArticleRoute(item.id, { source: 'public_browse' }))}
        >
          <ThemedText type="bodyBold">{item.title}</ThemedText>
          <ThemedText type="caption">{item.author.name}</ThemedText>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.row}>
          {catalog.isPaused ? (
            <ThemedText>{STRINGS.FIRST_PAGE_BROWSE_OFFLINE}</ThemedText>
          ) : catalog.isError ? (
            <ErrorState
              message={STRINGS.FAILED_TO_LOAD_ARTICLES}
              onRetry={() => void catalog.refetch()}
            />
          ) : catalog.isPending ? (
            <LoadingState />
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: LAYOUT.SPACING.LARGE },
  card: {
    padding: LAYOUT.SPACING.XLARGE,
    gap: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  row: {
    paddingVertical: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.TINY,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
