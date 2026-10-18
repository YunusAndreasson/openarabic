import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/common/EmptyState';
import type { IconName } from '@/components/ui/Icon';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

interface SeededContentEmptyStateProps {
  icon: IconName;
  title: string;
  hint: string;
  seedLabel: string;
  onSeed: () => void;
  isSeeding: boolean;
  canSeed: boolean;
}

/** Empty content state with the app's shared seed-first, browse-second path. */
export function SeededContentEmptyState({
  icon,
  title,
  hint,
  seedLabel,
  onSeed,
  isSeeding,
  canSeed,
}: SeededContentEmptyStateProps) {
  const router = useRouter();

  return (
    <EmptyState
      icon={icon}
      title={title}
      hint={hint}
      action={{
        label: seedLabel,
        onPress: onSeed,
        icon: 'sparkles-outline',
        loading: isSeeding,
        disabled: !canSeed,
      }}
      secondaryAction={{
        label: STRINGS.BROWSE_ARTICLES,
        // No `from` param: Explore used to read it to toast this empty
        // state's own hint back at the learner on arrival.
        onPress: () => router.navigate(ROUTE_PATHS.EXPLORE_TAB),
        icon: 'compass-outline',
      }}
    />
  );
}
