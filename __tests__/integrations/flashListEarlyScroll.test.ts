import { expect, jest, test } from '@jest/globals';
import { RecyclerViewManager } from '@shopify/flash-list/dist/recyclerview/RecyclerViewManager';
import ViewabilityManager from '@shopify/flash-list/dist/recyclerview/viewability/ViewabilityManager';

test.each([false, true])('FlashList accepts early scroll with viewability enabled %s', listen => {
  const onViewableItemsChanged = jest.fn();
  const manager = new RecyclerViewManager({
    data: ['row'],
    renderItem: () => null,
    onViewableItemsChanged: listen ? onViewableItemsChanged : undefined,
  });
  expect(manager.hasLayout()).toBe(false);
  expect(manager.isInitialScrollComplete).toBe(true);

  expect(() => {
    // RecyclerView's scroll handler calls these in this order.
    manager.recordInteraction();
    manager.computeItemViewability();
  }).not.toThrow();
  expect(onViewableItemsChanged).not.toHaveBeenCalled();

  const viewability = new ViewabilityManager(manager);
  expect(() => viewability.updateViewableItems([0])).not.toThrow();
  expect(() => manager.getWindowSize()).toThrow(
    'LayoutManager is not initialized, window size is unavailable',
  );
});
