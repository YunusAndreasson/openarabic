import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/ThemedButton';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import AnimatedItem from '@/components/AnimatedItem';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

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
      // Force immediate invalidation of all relevant queries
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
      queryClient.invalidateQueries({ queryKey: ['vocabularyStats'] });

      // Remove any cached data to force a fresh fetch
      queryClient.removeQueries({ queryKey: ['dueWords', user.id] });
      queryClient.removeQueries({ queryKey: ['studyWords', user.id] });
      queryClient.removeQueries({ queryKey: ['vocabularyStats'] });
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
      <View style={styles.centered}>
        <AnimatedItem delay={100}>
          <Ionicons name="checkmark-circle" size={80} color={colors.tint} />
        </AnimatedItem>

        <AnimatedItem delay={300}>
          <ThemedText type="heading2" variant="primary">
            Great job!
          </ThemedText>
        </AnimatedItem>

        <AnimatedItem delay={500}>
          <ThemedText type="heading3" variant="primary">
            You've completed your review session.
          </ThemedText>
        </AnimatedItem>

        <AnimatedItem delay={700}>
          <ThemedButton
            title="Done"
            onPress={onClose}
            style={{ marginTop: LAYOUT.SPACING.LARGE }}
          />
        </AnimatedItem>
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
  centered: {
    alignItems: 'center',
  },
});

export default CompletionScreen;
