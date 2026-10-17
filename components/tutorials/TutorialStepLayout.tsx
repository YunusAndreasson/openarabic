/**
 * Shared layout for a single tutorial step.
 *
 * Both first-run walkthroughs — the welcome intro on Explore and the review
 * tutorial on the first practice session — render through this, so they stay
 * visually identical. They previously had parallel copies of the same layout
 * that drifted three months apart in style.
 *
 * House style, matching CompletionScreen / EmptyState:
 * - hero icon in a faint tinted halo
 * - `heading1` title (a full-screen moment, not a card header)
 * - body text straight on the card — no nested surface
 * - `minHeight`, so a two-line title or a large system font scale grows the
 *   card instead of clipping it
 */

import { Icon, type IconName } from '@/components/ui';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { Dot } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { TUTORIAL_STEP_MIN_HEIGHT, TUTORIAL_VISUALS } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';

/** Which semantic colour the hero icon and its halo take. */
export type TutorialStepTone = 'tint' | 'error' | 'success';

interface TutorialStepLayoutProps {
  /** Hero icon shown above the title */
  icon?: IconName;
  /** Semantic colour for the icon and its halo (default: tint) */
  tone?: TutorialStepTone;
  title?: string;
  /** Body copy — a string, or rich content when a step needs inline bold */
  body?: ReactNode;
  /** Extra visual below the body (grade rows, animated hand) */
  children?: ReactNode;
  /** Dot pager — omit both to hide it */
  stepCount?: number;
  currentStep?: number;
}

export function TutorialStepLayout({
  icon,
  tone = 'tint',
  title,
  body,
  children,
  stepCount,
  currentStep,
}: TutorialStepLayoutProps) {
  const colors = useColors();
  const toneColor = colors[tone];
  const showDots = typeof stepCount === 'number' && stepCount > 1;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {icon && (
          <View
            style={[
              styles.iconHalo,
              { backgroundColor: withOpacity(toneColor, LAYOUT.OPACITY.FAINT) },
            ]}
          >
            <Icon name={icon} size={TUTORIAL_VISUALS.ICON_SIZE} color={toneColor} />
          </View>
        )}

        {title && (
          <ThemedText type="heading1" style={styles.title}>
            {title}
          </ThemedText>
        )}

        {typeof body === 'string' ? (
          <ThemedText type="body" colorName="secondaryText" style={styles.body}>
            {body}
          </ThemedText>
        ) : (
          body
        )}

        {children}
      </View>

      {showDots && (
        <View style={styles.dotsRow}>
          {Array.from({ length: stepCount }, (_, index) => (
            <Dot key={index} color={index === currentStep ? colors.tint : colors.border} />
          ))}
        </View>
      )}
    </View>
  );
}

TutorialStepLayout.displayName = 'TutorialStepLayout';

const styles = StyleSheet.create({
  container: {
    // minHeight, not height: keeps the card from resizing between steps of
    // similar length without clipping a step that legitimately needs more room.
    minHeight: TUTORIAL_STEP_MIN_HEIGHT,
    width: '100%',
  },
  content: {
    // NOT `flex: 1` — in React Native that means flexBasis: 0, so on a step whose
    // content is taller than minHeight the block gets sized to the leftover space
    // and its children overflow into the pager and the button. Grow into spare
    // room, never shrink below the natural height.
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHalo: {
    width: TUTORIAL_VISUALS.ICON_SIZE * 2,
    height: TUTORIAL_VISUALS.ICON_SIZE * 2,
    borderRadius: TUTORIAL_VISUALS.ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  title: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  body: {
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL,
    // Deliberately one step larger than the button's marginTop below: body text
    // carries ~1/3 of a line of descender slack under its last glyph, so equal
    // padding on both sides reads as the dots crowding the copy. This lands them
    // optically midway between the paragraph and the CTA.
    paddingTop: LAYOUT.SPACING.XXLARGE,
  },
});
