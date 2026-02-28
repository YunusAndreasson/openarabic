import { memo } from 'react';

/**
 * Header buttons for Practice tab — Dictionary only.
 * Primary "Start Review" action moved to content area.
 */
export const PracticeHeaderButtons = memo(function PracticeHeaderButtons({
  DictionaryComponent,
}: {
  DictionaryComponent: React.ReactNode;
}) {
  return <>{DictionaryComponent}</>;
});
