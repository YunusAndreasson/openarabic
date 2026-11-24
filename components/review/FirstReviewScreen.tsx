import { Redirect, Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ReviewSentenceWords } from './ReviewSentenceWords';
import { ReviewHeader } from '@/components/review/ReviewHeader';
import { ReviewActionButton } from '@/components/review/ReviewActionButton';
import { GRADE_PRESENTATION } from '@/components/review/ReviewGradeBar';
import { REVIEW_CHOICE_TONE_COLOR } from '@/components/review/ReviewChoiceRow';
import { CONFIDENCE_TO_RATING } from '@/constants/fsrs';
import { getArabicHeroTextStyle, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFirstReview } from '@/hooks/onboarding/useFirstReview';
import { useColors } from '@/hooks/theme/useColors';
import {
  chooseFirstGrade,
  confirmFirstGrade,
  prepareFirstReview,
  revealFirstReview,
} from '@/services/firstReview';
import { selectArabicFontSize } from '@/store/settingsSlice';
import { useAppSelector } from '@/store/hooks';
import type { RootId } from '@/types/branded.types';
import { WORD_CONFIDENCES } from '@/types/review.types';
import { previewWordDueDates } from '@/utils/fsrsScheduler';
import { formatPreviewInterval, spokenPreviewInterval } from '@/utils/review/formatPreviewInterval';

import { getFirstReviewReceiptRoute } from '@/utils/routeBuilders';

export function FirstReviewScreen({ rootId }: { rootId: RootId }) {
  const { user } = useAuth();
  return user ? <GuidedCard key={user.id + '-' + rootId} owner={user.id} root={rootId} /> : null;
}

function GuidedCard({ owner, root }: { owner: string; root: RootId }) {
  const colors = useColors();
  const size = useAppSelector(selectArabicFontSize);
  const { fontScale } = useWindowDimensions();
  const { review, error, busy, run, reload, exit } = useFirstReview(owner, root);
  const card = review?.card;
  const step = review?.step;
  const complete = step === 'complete';
  const revealed = step !== 'recall' && step !== 'conflict' && !complete;
  const failed = error || step === 'error';
  const now = new Date();
  const dues = card && step === 'answer' ? previewWordDueDates(card.row, now) : undefined;
  const reveal = () => {
    if (review) run(() => revealFirstReview(review));
  };
  const Card = step === 'recall' ? Pressable : View;
  function retry() {
    if (review?.step === 'conflict') run(() => prepareFirstReview(review));
    else if (review?.attempt) run(() => confirmFirstGrade(review));
    else reload();
  }
  if (complete) return <Redirect href={getFirstReviewReceiptRoute(root)} />;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ReviewHeader progress={0} maxProgress={0} onClose={exit} />
      <ScrollView contentContainerStyle={styles.page}>
        <Card
          {...(step === 'recall' && card
            ? {
                onPress: reveal,
                disabled: busy,
                accessibilityRole: 'button' as const,
                accessibilityLabel: card.letters,
                accessibilityHint: STRINGS.SHOW_ANSWER,
              }
            : {})}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <ThemedText type="bodyBold" align="center" colorName="tint" accessibilityRole="header">
            {STRINGS.FIRST_REVIEW_TITLE}
          </ThemedText>
          <View style={styles.center}>
            {card && (
              <>
                <ThemedText
                  type="arabic"
                  align="center"
                  accessibilityLanguage="ar"
                  style={getArabicHeroTextStyle(size * 2)}
                >
                  {card.letters}
                </ThemedText>
                {step === 'recall' && (
                  <ThemedText type="heading3" colorName="secondaryText" align="center">
                    {STRINGS.FIRST_REVIEW_PROMPT}
                  </ThemedText>
                )}
                {revealed && (
                  <>
                    <ThemedText type="heading2" accessibilityLiveRegion="polite" align="center">
                      {card.meaning}
                    </ThemedText>
                    <View style={[styles.context, { borderColor: colors.border }]}>
                      <ThemedText type="label" align="center">
                        {STRINGS.FIRST_REVIEW_CONTEXT}
                      </ThemedText>
                      <ReviewSentenceWords sentence={card.sentence} runs={card.segments} />
                      <ThemedText colorName="secondaryText" align="center">
                        {card.translation}
                      </ThemedText>
                    </View>
                  </>
                )}
              </>
            )}
            {busy && <ActivityIndicator color={colors.tint} />}
          </View>
        </Card>
        {failed || step === 'conflict' ? (
          <>
            <ThemedText accessibilityRole="alert" type="bodyBold">
              {step === 'conflict' ? STRINGS.FIRST_REVIEW_CONFLICT : STRINGS.FIRST_REVIEW_FAILED}
            </ThemedText>
            {failed && (
              <ThemedText colorName="secondaryText">{STRINGS.FIRST_REVIEW_RETRY_HINT}</ThemedText>
            )}
            <ThemedButton disabled={busy} title={STRINGS.PLEASE_TRY_AGAIN} onPress={retry} />
          </>
        ) : step === 'recall' && card ? (
          <ThemedButton title={STRINGS.SHOW_ANSWER} disabled={busy} onPress={reveal} />
        ) : review?.step === 'restudy' ? (
          <ThemedButton
            title={STRINGS.FIRST_REVIEW_AGAIN}
            disabled={busy}
            onPress={() => run(() => confirmFirstGrade(review))}
          />
        ) : review?.step === 'answer' && dues ? (
          <View style={[styles.grades, fontScale >= 1.6 && styles.stacked]}>
            {WORD_CONFIDENCES.map(grade => {
              const choice = GRADE_PRESENTATION[grade];
              const due = dues[CONFIDENCE_TO_RATING[grade]];
              const interval = formatPreviewInterval(due, now);
              return (
                <ReviewActionButton
                  key={grade}
                  label={choice.label}
                  sublabel={interval}
                  accessibilityLabel={choice.label + ', ' + spokenPreviewInterval(interval)}
                  color={colors[REVIEW_CHOICE_TONE_COLOR[choice.tone]]}
                  disabled={busy}
                  onPress={() => run(() => chooseFirstGrade(review, grade))}
                />
              );
            })}
          </View>
        ) : null}
        <ThemedButton variant="ghost" title={STRINGS.FIRST_PAGE_BACK} onPress={exit} />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { flexGrow: 1, padding: LAYOUT.SPACING.LARGE, gap: LAYOUT.SPACING.MEDIUM },
  card: {
    flexGrow: 1,
    padding: LAYOUT.SPACING.XLARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  context: {
    width: '100%',
    gap: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
    borderTopWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  grades: { flexDirection: 'row', gap: LAYOUT.SPACING.SMALL },
  stacked: { flexDirection: 'column' },
});
