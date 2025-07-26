import {
  createContentContainerStyle,
  createFlashListConfig,
  createListContainerStyle,
  createOverrideItemLayout,
  createViewabilityConfig,
} from '@/utils/listUtils';

describe('listUtils', () => {
  describe('createViewabilityConfig', () => {
    it('should create viewability config with correct defaults', () => {
      const config = createViewabilityConfig();

      expect(config.itemVisiblePercentThreshold).toBe(50);
      expect(config.minimumViewTime).toBe(100);
    });
  });

  describe('createContentContainerStyle', () => {
    it('should create content container style with correct padding', () => {
      const bottomInset = 20;
      const style = createContentContainerStyle(bottomInset);

      expect(style.paddingTop).toBe(0);
      expect(style.paddingBottom).toBe(bottomInset + 48);
    });
  });

  describe('createListContainerStyle', () => {
    it('should create list container style with correct properties', () => {
      const backgroundColor = '#ffffff';
      const style = createListContainerStyle(backgroundColor);

      expect(style.flex).toBe(1);
      expect(style.height).toBe(100);
      expect(style.backgroundColor).toBe(backgroundColor);
    });
  });

  describe('createOverrideItemLayout', () => {
    it('should create override item layout function', () => {
      const itemHeight = 100;
      const overrideFn = createOverrideItemLayout(itemHeight);
      const layout = { size: 0 };

      overrideFn(layout);

      expect(layout.size).toBe(itemHeight);
    });
  });

  describe('createFlashListConfig', () => {
    it('should create FlashList configuration with all properties', () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const mockRenderItem = jest.fn();
      const mockKeyExtractor = jest.fn();
      const mockOnScroll = jest.fn();

      const config = createFlashListConfig({
        data: mockData,
        renderItem: mockRenderItem,
        keyExtractor: mockKeyExtractor,
        estimatedItemSize: 100,
        onScroll: mockOnScroll,
        drawDistance: 200,
      });

      expect(config.data).toBe(mockData);
      expect(config.renderItem).toBe(mockRenderItem);
      expect(config.keyExtractor).toBe(mockKeyExtractor);
      expect(config.estimatedItemSize).toBe(100);
      expect(config.onScroll).toBe(mockOnScroll);
      expect(config.drawDistance).toBe(200);
      expect(config.scrollEventThrottle).toBe(16);
      expect(config.showsVerticalScrollIndicator).toBe(false);
      expect(config.removeClippedSubviews).toBe(true);
      expect(config.alwaysBounceVertical).toBe(false);
      expect(config.bounces).toBe(true);
      expect(config.overScrollMode).toBe('auto');
      expect(config.persistentScrollbar).toBe(false);
      expect(config.initialScrollIndex).toBe(0);
    });

    it('should use custom values when provided', () => {
      const config = createFlashListConfig({
        data: [],
        renderItem: jest.fn(),
        keyExtractor: jest.fn(),
        estimatedItemSize: 50,
        scrollEventThrottle: 32,
        showsVerticalScrollIndicator: true,
        removeClippedSubviews: false,
        alwaysBounceVertical: true,
        bounces: false,
        overScrollMode: 'never',
        persistentScrollbar: true,
        initialScrollIndex: 5,
      });

      expect(config.scrollEventThrottle).toBe(32);
      expect(config.showsVerticalScrollIndicator).toBe(true);
      expect(config.removeClippedSubviews).toBe(false);
      expect(config.alwaysBounceVertical).toBe(true);
      expect(config.bounces).toBe(false);
      expect(config.overScrollMode).toBe('never');
      expect(config.persistentScrollbar).toBe(true);
      expect(config.initialScrollIndex).toBe(5);
    });
  });
});
