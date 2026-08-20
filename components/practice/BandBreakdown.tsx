import type { JSX } from 'react';

import { SheetExplainer } from '@/components/common';
import { ROUTE_PATHS } from '@/constants/routes';
import type { DictionaryScope } from '@/hooks/vocabulary/useDictionaryList';
import { dismissSheetThenNavigate } from '@/utils/sheetNavigation';

import { BreakdownRow, breakdownRowLabel } from './BreakdownRow';

export interface BreakdownBand {
  /** React key. The band key from whichever distribution built this row. */
  key: string;
  label: string;
  /** The caption under the label — what the band MEANS, in plain language. */
  hint: string;
  count: number;
  /**
   * Position on the shared axis, or `undefined` for a row that is not on it.
   *
   * Both sheets end in a residual — words with no practice behind them — and
   * both keep it off the axis rather than drawing it at zero, because "not on
   * this scale" and "at the bottom of this scale" are different statements.
   */
  fraction?: number;
  /** Marks one row as the typical case, e.g. the band the median falls in. */
  tag?: string;
  /** Which dictionary filter this row opens. */
  scope: DictionaryScope;
  /**
   * The caption as a full spoken clause. Only the caller knows whether its own
   * hint needs a verb in front of it — "holds under a week" is right for a
   * horizon band and wrong for "no horizon yet".
   */
  clause: string;
}

interface BandBreakdownProps {
  bands: BreakdownBand[];
  /** The closing sentence: the mechanism when there is data, the invitation when there is not. */
  explainer: string;
}

/**
 * A distribution read out as rows, each one a door into the words it counts.
 *
 * Both practice breakdown sheets are this: `/memory-retention` partitions the
 * collection by `fsrs_stability`, `/review-depth` partitions it by `fsrs_reps`,
 * and everything from there down was written twice — the same map, the same
 * `count > 0` pressability rule, the same `breakdownRowLabel` call, the same
 * closing explainer, and two byte-identical `openScope` helpers.
 *
 * The reason to fold them is not the ~35 duplicated lines. It is that the two
 * lists had already drifted apart in the thing a learner actually reads: they
 * ran in OPPOSITE directions, one ascending and one descending, in identical
 * chrome. Ordering now belongs to the band arrays the callers pass
 * (`HORIZON_BAND_KEYS`, `DEPTH_BAND_KEYS`, both ascending with the residual
 * last), and the rendering that made them look interchangeable is genuinely one
 * component — so the next divergence has to be deliberate rather than quiet.
 */
export function BandBreakdown({ bands, explainer }: BandBreakdownProps): JSX.Element {
  // Dismiss the sheet, then open the band's words once it has actually gone.
  // The sequencing — and why it cannot be a push, a replace, or a timer — lives
  // in `dismissSheetThenNavigate`.
  const openScope = (scope: DictionaryScope) => {
    dismissSheetThenNavigate({ pathname: ROUTE_PATHS.PRACTICE_DICTIONARY, params: { scope } });
  };

  return (
    <>
      {bands.map(band => (
        <BreakdownRow
          key={band.key}
          label={band.label}
          hint={band.hint}
          count={band.count}
          fraction={band.fraction}
          tag={band.tag}
          accessibilityLabel={breakdownRowLabel({
            band: band.label,
            count: band.count,
            clause: band.clause,
          })}
          // An empty band has nothing on the other side of the tap, so it does
          // not claim to lead anywhere — the rule `BreakdownRow` draws its
          // chevron from.
          onPress={band.count > 0 ? () => openScope(band.scope) : undefined}
        />
      ))}

      <SheetExplainer text={explainer} />
    </>
  );
}

BandBreakdown.displayName = 'BandBreakdown';
