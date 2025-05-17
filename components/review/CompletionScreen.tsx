import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';

import Section from '@/components/Section';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';

interface CompletionScreenProps {
  onClose: () => void;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({ onClose }) => {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Ensure queries are invalidated when the component mounts
  useEffect(() => {
    if (user?.id) {
      // Invalidate all relevant queries at once
      queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return key === 'dueWords' || key === 'studyWords' || key === 'vocabularyStats';
        },
      });
    }
  }, [user?.id, queryClient]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.contentContainer}>
        <Section delay={100} animated>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={100} color={colors.tint} />
          </View>
        </Section>

        <View style={styles.textContainer}>
          <Section delay={300} animated>
            <ThemedText type="heading2" variant="primary" style={styles.titleText}>
              Great job!
            </ThemedText>
          </Section>

          <Section delay={500} animated>
            <ThemedText type="heading3" variant="primary" style={styles.subtitleText}>
              You completed your review session.
            </ThemedText>
          </Section>
        </View>

        <Section delay={700} animated>
          <ThemedButton title="Done" onPress={onClose} style={styles.doneButton} />
        </Section>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  } as ViewStyle,
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 350,
    width: '100%',
  },
  doneButton: {
    marginTop: LAYOUT.SPACING.LARGE,
    minWidth: 150,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE * 1.5,
  },
  subtitleText: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE * 1.5,
    width: '100%',
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
});

export default CompletionScreen;
