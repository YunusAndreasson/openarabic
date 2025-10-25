import { useCallback, useMemo, useState } from 'react';

import { useAppSelectorShallow } from '@/store/hooks';
import type { ArticleId } from '@/types/branded.types';
import { DisplayLanguage } from '@/types/enums';

interface UseArticleLanguagePreferenceReturn {
  showEnglish: boolean;
  toggleLanguage: () => void;
  isOverridden: boolean;
  currentPreference: DisplayLanguage;
}

/**
 * Hook to manage per-article language display preference (session-only)
 * Falls back to global displayLanguagePreference when no local override exists
 * State is reset when article closes (not persisted)
 *
 * @param articleId - The ID of the current article
 * @returns Object containing showEnglish boolean, toggle function, and override status
 */
export function useArticleLanguagePreference(
  articleId: ArticleId | undefined,
): UseArticleLanguagePreferenceReturn {
  // Get global display language preference
  const globalPreference = useAppSelectorShallow(state => state.settings.displayLanguagePreference);

  // Local override state (resets when component unmounts)
  const [localOverride, setLocalOverride] = useState<DisplayLanguage | undefined>(undefined);

  // Determine effective preference (local override > global)
  const currentPreference = useMemo(() => {
    return localOverride ?? globalPreference;
  }, [localOverride, globalPreference]);

  // Convert to boolean for ArticleSentence component
  const showEnglish = useMemo(() => {
    return currentPreference === DisplayLanguage.ARABIC_ENGLISH;
  }, [currentPreference]);

  // Check if article has local override different from global
  const isOverridden = useMemo(() => {
    return localOverride !== undefined && localOverride !== globalPreference;
  }, [localOverride, globalPreference]);

  // Toggle language preference
  const toggleLanguage = useCallback(() => {
    if (!articleId) return;

    // Calculate opposite preference
    const newPreference =
      currentPreference === DisplayLanguage.ARABIC_ENGLISH
        ? DisplayLanguage.ARABIC_ONLY
        : DisplayLanguage.ARABIC_ENGLISH;

    // If new preference matches global, clear local override
    if (newPreference === globalPreference) {
      setLocalOverride(undefined);
    } else {
      // Set local override (session-only)
      setLocalOverride(newPreference);
    }
  }, [articleId, currentPreference, globalPreference]);

  return {
    showEnglish,
    toggleLanguage,
    isOverridden,
    currentPreference,
  };
}
