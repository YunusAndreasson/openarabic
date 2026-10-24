import { LAYOUT } from '@/constants/layout';
import { createExternalStore } from '@/utils/createExternalStore';

// Transient layout state, shared by the visible player and the scrolling
// screens it covers. Audio position updates never touch this subscription.
const playerHeight = createExternalStore<number>(LAYOUT.CARD.HEIGHT.MINI_PLAYER);

export function updateMiniPlayerHeight(height: number): void {
  const next = Math.max(LAYOUT.CARD.HEIGHT.MINI_PLAYER, Math.ceil(height));
  if (!Number.isFinite(next)) return;
  playerHeight.set(next);
}

export function useMiniPlayerHeight(): number {
  return playerHeight.useValue();
}
