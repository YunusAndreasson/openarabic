import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Canvas, Group, Circle, Path, LinearGradient, vec, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withTiming } from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { VocabularyStats } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from '../BaseCard';
import { ThemedText } from '../ThemedText';

type StatCategory = 'total' | 'mastered' | 'learning' | 'due';

interface VocabularyStatCardsProps
  extends Pick<VocabularyStats, 'totalWords' | 'dueWords' | 'masteredWords' | 'learningWords'> {
  onStatPress?: (category: StatCategory) => void;
}

interface StatCardProps {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  category: StatCategory;
  onPress?: (category: StatCategory) => void;
}

// Flow visualization component using Skia
const VocabularyFlowVisualization = memo(
  ({
    totalWords,
    masteredWords,
    learningWords,
    dueWords,
  }: Pick<
    VocabularyStatCardsProps,
    'totalWords' | 'masteredWords' | 'learningWords' | 'dueWords'
  >) => {
    const colors = useColors();
    const screenWidth = Dimensions.get('window').width - LAYOUT.SCREEN_EDGE_PADDING * 2;
    const canvasHeight = 100; // Reduced height for less visual dominance

    // Animation values
    const progress = useSharedValue(0);
    const flowProgress = useSharedValue(0);

    useEffect(() => {
      progress.value = withTiming(1, { duration: 1500 });
      flowProgress.value = withTiming(1, { duration: 2000 });
    }, [totalWords, masteredWords, learningWords, dueWords]);

    // Calculate proportions and positions with proper data validation
    const stats = useMemo(() => {
      const total = totalWords || 1;

      // Ensure data consistency - words can't exceed total
      const validMastered = Math.min(masteredWords, total);
      const validLearning = Math.min(learningWords, total);
      const validDue = Math.min(dueWords, total);

      // Calculate new words properly: total - all categorized words
      // Note: Due words are typically a subset of learning words in FSRS systems
      const newWords = Math.max(0, total - validMastered - validLearning);

      // Calculate ratios for visualization
      const masteredRatio = validMastered / total;
      const learningRatio = validLearning / total;
      const dueRatio = validDue / total;
      const newRatio = newWords / total;

      // Position nodes along the flow
      const nodeRadius = 16;
      const padding = 40;
      const availableWidth = screenWidth - padding * 2;

      return {
        nodes: {
          new: { x: padding, y: canvasHeight / 2, ratio: newRatio, color: colors.text },
          learning: {
            x: padding + availableWidth * 0.33,
            y: canvasHeight / 2,
            ratio: learningRatio,
            color: colors.info,
          },
          due: {
            x: padding + availableWidth * 0.66,
            y: canvasHeight / 2 - 20,
            ratio: dueRatio,
            color: colors.warning,
          },
          mastered: {
            x: padding + availableWidth,
            y: canvasHeight / 2,
            ratio: masteredRatio,
            color: colors.success,
          },
        },
        nodeRadius,
        total,
        // Return calculated values for use in stat cards
        newWords,
        validMastered,
        validLearning,
        validDue,
      };
    }, [totalWords, masteredWords, learningWords, dueWords, colors, screenWidth, canvasHeight]);

    // Create animated paths between nodes
    const createFlowPath = (from: any, to: any, curvature = 0.3) => {
      const path = Skia.Path.Make();
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 + curvature * Math.abs(to.x - from.x) * 0.3;

      path.moveTo(from.x, from.y);
      path.quadTo(midX, midY, to.x, to.y);
      return path;
    };

    const flowPaths = useMemo(
      () => ({
        newToLearning: createFlowPath(stats.nodes.new, stats.nodes.learning),
        learningToDue: createFlowPath(stats.nodes.learning, stats.nodes.due, -0.5),
        dueToLearning: createFlowPath(stats.nodes.due, stats.nodes.learning, 0.5),
        learningToMastered: createFlowPath(stats.nodes.learning, stats.nodes.mastered),
        dueToMastered: createFlowPath(stats.nodes.due, stats.nodes.mastered, 0.3),
      }),
      [stats.nodes]
    );

    // Animated opacity for flow lines
    const flowOpacity = useDerivedValue(() => {
      return 0.3 + Math.sin(flowProgress.value * Math.PI * 2) * 0.2;
    });

    return (
      <BaseCard style={styles.flowCard} shadowSize="small" includePressAnimation={false}>
        <View style={styles.flowHeader}>
          <View style={styles.flowHeaderTop}>
            <View style={styles.flowTitleContainer}>
              <ThemedText type="overline" weight="medium" variant="secondary">
                LEARNING FLOW
              </ThemedText>
            </View>
            <View style={styles.totalWordsContainer}>
              <ThemedText type="body" weight="bold" style={styles.totalWordsValue}>
                {stats.total.toLocaleString()}
              </ThemedText>
              <ThemedText type="caption" variant="secondary" style={styles.totalWordsLabel}>
                Total Words
              </ThemedText>
            </View>
          </View>
        </View>

        <Canvas style={[styles.flowCanvas, { width: screenWidth, height: canvasHeight }]}>
          <Group>
            {/* Background flow paths */}
            <Group opacity={0.1}>
              <Path
                path={flowPaths.newToLearning}
                style="stroke"
                strokeWidth={2}
                color={colors.info}
              />
              <Path
                path={flowPaths.learningToDue}
                style="stroke"
                strokeWidth={2}
                color={colors.warning}
              />
              <Path
                path={flowPaths.dueToLearning}
                style="stroke"
                strokeWidth={2}
                color={colors.info}
              />
              <Path
                path={flowPaths.learningToMastered}
                style="stroke"
                strokeWidth={2}
                color={colors.success}
              />
              <Path
                path={flowPaths.dueToMastered}
                style="stroke"
                strokeWidth={2}
                color={colors.success}
              />
            </Group>

            {/* Animated flow paths */}
            <Group opacity={flowOpacity}>
              <Path
                path={flowPaths.newToLearning}
                style="stroke"
                strokeWidth={3}
                color={colors.info}
                start={0}
                end={progress}
              />
              <Path
                path={flowPaths.learningToMastered}
                style="stroke"
                strokeWidth={3}
                color={colors.success}
                start={0}
                end={progress}
              />
              <Path
                path={flowPaths.learningToDue}
                style="stroke"
                strokeWidth={2}
                color={colors.warning}
                start={0}
                end={progress}
              />
              <Path
                path={flowPaths.dueToMastered}
                style="stroke"
                strokeWidth={2}
                color={colors.success}
                start={0}
                end={progress}
              />
            </Group>

            {/* Node circles with size based on proportion */}
            {Object.entries(stats.nodes).map(([key, node]) => {
              const radius = Math.max(8, stats.nodeRadius * (0.5 + node.ratio * 1.5));
              return (
                <Group key={key}>
                  {/* Outer glow */}
                  <Circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 4}
                    color={withOpacity(node.color, 0.2)}
                  />
                  {/* Main circle */}
                  <Circle cx={node.x} cy={node.y} r={radius} color={node.color} />
                  {/* Inner highlight */}
                  <Circle
                    cx={node.x}
                    cy={node.y - 2}
                    r={radius * 0.3}
                    color={withOpacity('#FFFFFF', 0.4)}
                  />
                </Group>
              );
            })}

            {/* Gradient overlay for depth */}
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, canvasHeight)}
              colors={[
                withOpacity(colors.card, 0),
                withOpacity(colors.card, 0.1),
                withOpacity(colors.card, 0),
              ]}
            />
          </Group>
        </Canvas>

        {/* Legend */}
        <View style={styles.flowLegend}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.text }]} />
              <ThemedText type="caption" variant="secondary">
                New
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
              <ThemedText type="caption" variant="secondary">
                Learning
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <ThemedText type="caption" variant="secondary">
                Review
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
              <ThemedText type="caption" variant="secondary">
                Mastered
              </ThemedText>
            </View>
          </View>
        </View>
      </BaseCard>
    );
  }
);

VocabularyFlowVisualization.displayName = 'VocabularyFlowVisualization';

// Individual stat card component with perfect UX and original color scheme
const StatCard = memo(
  ({ value, label, icon, iconColor, bgColor, borderColor, category, onPress }: StatCardProps) => {
    const colors = useColors();

    const handlePress = () => {
      if (onPress) {
        lightFeedback();
        onPress(category);
      }
    };

    return (
      <BaseCard
        onPress={handlePress}
        style={styles.statCard}
        shadowSize="small"
        includePressAnimation={true}
      >
        <View style={styles.cardContent}>
          {/* Left side - Icon with original color scheme */}
          <View style={[styles.iconContainer, { backgroundColor: bgColor, borderColor }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>

          {/* Center - Main content with proper hierarchy */}
          <View style={styles.contentCenter}>
            <ThemedText type="heading3" weight="bold" style={styles.statValue}>
              {value.toLocaleString()}
            </ThemedText>
            <ThemedText type="caption" weight="medium" variant="secondary" style={styles.statLabel}>
              {label}
            </ThemedText>
          </View>

          {/* Right side - Navigation indicator */}
          <View style={styles.contentRight}>
            <Ionicons
              name="chevron-forward-outline"
              size={18}
              color={colors.textTertiary}
              style={styles.navigationIcon}
            />
          </View>
        </View>
      </BaseCard>
    );
  }
);

StatCard.displayName = 'StatCard';

export const VocabularyStatCards = memo(
  ({
    totalWords = 0,
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onStatPress,
  }: VocabularyStatCardsProps) => {
    const colors = useColors();

    // Calculate validated data with proper consistency checks
    const validatedData = useMemo(() => {
      const total = totalWords || 1;

      // Ensure data consistency - words can't exceed total
      const validMastered = Math.min(masteredWords, total);
      const validLearning = Math.min(learningWords, total);
      const validDue = Math.min(dueWords, total);

      // Calculate new words properly: total - all categorized words
      // Note: Due words are typically a subset of learning words in FSRS systems
      const newWords = Math.max(0, total - validMastered - validLearning);

      return {
        total,
        newWords,
        mastered: validMastered,
        learning: validLearning,
        due: validDue,
      };
    }, [totalWords, masteredWords, learningWords, dueWords]);

    // Prepare stat cards data - focused on actionable categories only
    const statCards: StatCardProps[] = useMemo(
      () => [
        {
          value: validatedData.newWords,
          label: 'New Words',
          icon: 'add-circle-outline',
          iconColor: colors.textTertiary,
          bgColor: withOpacity(colors.textTertiary, 0.19),
          borderColor: colors.textTertiary + '40',
          category: 'total', // Navigate to total words list to see all words
        },
        {
          value: validatedData.learning,
          label: 'Learning',
          icon: 'school-outline',
          iconColor: colors.info,
          bgColor: withOpacity(colors.info, 0.19),
          borderColor: colors.info + '40',
          category: 'learning',
        },
        {
          value: validatedData.due,
          label: 'Review',
          icon: 'alarm-outline',
          iconColor: colors.warning,
          bgColor: withOpacity(colors.warning, 0.19),
          borderColor: colors.warning + '40',
          category: 'due',
        },
        {
          value: validatedData.mastered,
          label: 'Mastered',
          icon: 'checkmark-circle-outline',
          iconColor: colors.success,
          bgColor: withOpacity(colors.success, 0.19),
          borderColor: colors.success + '40',
          category: 'mastered',
        },
      ],
      [validatedData, colors]
    );

    return (
      <View style={styles.container}>
        {/* Flow Visualization */}
        <VocabularyFlowVisualization
          totalWords={validatedData.total}
          masteredWords={validatedData.mastered}
          learningWords={validatedData.learning}
          dueWords={validatedData.due}
        />

        {/* Stat Cards Grid - 2x2 Layout */}
        <View style={styles.statsGrid}>
          {statCards.map(card => (
            <StatCard
              key={`vocab-stat-card-${card.category}`}
              value={card.value}
              label={card.label}
              icon={card.icon}
              iconColor={card.iconColor}
              bgColor={card.bgColor}
              borderColor={card.borderColor}
              category={card.category}
              onPress={onStatPress}
            />
          ))}
        </View>
      </View>
    );
  }
);

VocabularyStatCards.displayName = 'VocabularyStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.MEDIUM, // Increased gap for better separation
    marginBottom: LAYOUT.SPACING.LARGE, // More space before next section
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
    justifyContent: 'space-between',
  },
  flowCard: {
    width: '100%',
    marginBottom: LAYOUT.SPACING.MEDIUM, // Clear separation from stats
  },
  flowHeader: {
    padding: LAYOUT.CARD.PADDING.MEDIUM, // Consistent padding with other cards
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  flowHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Better alignment
  },
  flowTitleContainer: {
    flex: 1,
  },
  totalWordsContainer: {
    alignItems: 'flex-end',
  },
  totalWordsValue: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2, // Smaller, more balanced
  },
  totalWordsLabel: {
    marginTop: LAYOUT.SPACING.MICRO, // Tighter spacing
  },
  flowCanvas: {
    alignSelf: 'center',
    marginVertical: LAYOUT.SPACING.TINY, // Reduced vertical space
  },
  flowLegend: {
    padding: LAYOUT.CARD.PADDING.SMALL, // Reduced padding
    paddingTop: LAYOUT.SPACING.TINY,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  legendDot: {
    width: 6, // Smaller dots for less visual weight
    height: 6,
    borderRadius: 3,
  },
  statCard: {
    width: '48%',
    minWidth: 150,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.CARD.PADDING.MEDIUM, // Consistent padding
    minHeight: 76, // Slightly taller for better proportion
  },
  iconContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL, // Slightly larger for better proportion
    borderWidth: LAYOUT.BORDER.WIDTH.THICK,
    width: 44, // Larger for better visual weight
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCenter: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.MEDIUM, // More space for better breathing room
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  contentRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  statValue: {
    marginBottom: LAYOUT.SPACING.TINY, // Consistent spacing
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.1,
  },
  statLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  navigationIcon: {
    opacity: 0.5, // Reduced opacity for less visual weight
  },
});
