import { useSyncExternalStore } from 'react';

import { LAYOUT } from '@/constants/layout';

// Transient layout state, shared by the visible player and the scrolling
// screens it covers. Audio position updates never touch this subscription.
let playerHeight = LAYOUT.CARD.HEIGHT.MINI_PLAYER;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getHeight = () => playerHeight;

export function updateMiniPlayerHeight(height: number): void {
  const next = Math.max(LAYOUT.CARD.HEIGHT.MINI_PLAYER, Math.ceil(height));
  if (!Number.isFinite(next) || next === playerHeight) return;
  playerHeight = next;
  listeners.forEach(listener => listener());
}

export function useMiniPlayerHeight(): number {
  return useSyncExternalStore(subscribe, getHeight, getHeight);
}
