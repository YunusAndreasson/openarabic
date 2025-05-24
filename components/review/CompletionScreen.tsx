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
import { ThemedView } from '@/components/ThemedView';

interface CompletionScreenProps {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonVariant?: 'filled' | 'outlined';
  iconName?: string;
  iconSize?: number;
  useThemedView?: boolean;
  contentStyle?: object;
  buttonStyle?: object;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({
  onClose,
  title = 'Great job!',
  subtitle = 'You completed your review session.',
  buttonText = 'Done',
  buttonVariant = 'filled',
  iconName = 'checkmark-circle',
  iconSize = 100,
  useThemedView = false,
  contentStyle = {},
  buttonStyle = {},
}) => {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Only invalidate queries for review flow
  React.useEffect(() => {
    if (!useThemedView && user?.id) {
      queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return key === 'dueWords' || key === 'studyWords' || key === 'vocabularyStats';
        },
      });
    }
  }, [user?.id, queryClient, useThemedView]);

  const Content = (
    <View style={[styles.contentContainer, contentStyle]}>
      <Section delay={100} animated>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName as any} size={iconSize} color={colors.completionSuccess} />
        </View>
      </Section>
      <View style={styles.textContainer}>
        <Section delay={300} animated>
          <ThemedText type="heading2" variant="primary" style={styles.titleText}>
            {title}
          </ThemedText>
        </Section>
        <Section delay={500} animated>
          <ThemedText type="heading3" variant="primary" style={styles.subtitleText}>
            {subtitle}
          </ThemedText>
        </Section>
      </View>
      <Section delay={700} animated>
        <ThemedButton
          title={buttonText}
          onPress={onClose}
          variant={buttonVariant}
          style={[styles.doneButton, buttonStyle]}
        />
      </Section>
    </View>
  );

  if (useThemedView) {
    return (
      <ThemedView style={styles.container} useSafeArea={true}>
        {Content}
      </ThemedView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {Content}
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
