'use client';

import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  type AnalyticsChoice,
  readAnalyticsChoice,
  saveAnalyticsChoice,
  stopAnalytics,
  subscribeAnalyticsChoice,
} from '@/lib/analytics-consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const STATUS: Record<AnalyticsChoice | 'none', string> = {
  none: 'You have not made a choice, so Google Analytics is off.',
  denied: 'You refused, so Google Analytics is off.',
  granted: 'You allowed Google Analytics, so it is on.',
};

const choose = (gaId: string, choice: AnalyticsChoice) => {
  saveAnalyticsChoice(choice);
  if (choice === 'granted') window.oaStartAnalytics?.();
  else stopAnalytics(gaId);
};

/**
 * The one place a visitor can turn Google Analytics on or off, reached from the footer
 * link to /privacy#analytics. There is deliberately no banner, by the owner's choice.
 * Nothing shows on the server or without JavaScript, where GA can't run, or when
 * analytics isn't set up.
 */
export function AnalyticsChoicePanel() {
  const choice = useSyncExternalStore(subscribeAnalyticsChoice, readAnalyticsChoice, () => undefined);

  if (!GA_ID || choice === undefined) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="text-sm text-muted-foreground">
        {STATUS[choice ?? 'none']}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          aria-pressed={choice === 'denied'}
          onClick={() => choose(GA_ID, 'denied')}
        >
          Refuse
        </Button>
        <Button
          variant="outline"
          aria-pressed={choice === 'granted'}
          onClick={() => choose(GA_ID, 'granted')}
        >
          Allow
        </Button>
      </div>
    </div>
  );
}
