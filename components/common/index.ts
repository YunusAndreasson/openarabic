/**
 * Common components — layout, state and composition primitives.
 *
 * Everything public is exported here; import from `@/components/common`, not
 * from the individual files. (Interactive controls live in `@/components/ui`.)
 */

export { AnimatedCount } from './AnimatedCount';
export { AppErrorFallback } from './AppErrorFallback';
export { Badge } from './Badge';
export { BaseCard } from './BaseCard';

export { BottomSheetErrorBoundary } from './BottomSheetErrorBoundary';
export { BottomSheetHeader } from './BottomSheetHeader';
export { BottomSheetStateHandler } from './BottomSheetStateHandler';

export { ColorCodedText } from './ColorCodedText';
export { ComponentErrorBoundary } from './ComponentErrorBoundary';
export { Dot } from './Dot';
export { EmailLink } from './EmailLink';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';

// `DocEffectiveDate` is used only by the two documents in ./legal, which import
// it by direct path.
export { DocCredit, DocHeading, DocLink, DocParagraph, LegalDocument } from './LegalDocument';

export { ListRow } from './ListRow';
export { ListSeparator } from './ListSeparator';
export { LoadingState } from './LoadingState';
export { MetricCard } from './MetricCard';
export { OptionCard } from './OptionCard';
export { PrimingCard } from './PrimingCard';
export { ProgressBar } from './ProgressBar';
export { ScreenScaffold } from './ScreenScaffold';
export { SeededContentEmptyState } from './SeededContentEmptyState';
export { SectionLabel } from './SectionLabel';
export { SheetScreen } from './SheetScreen';

// `SkiaColoredArabic` is deliberately NOT exported here: its only consumers are
// a sibling in this directory and one in components/review, both of which must
// import it by direct path to keep the ui|common|providers barrels acyclic.
