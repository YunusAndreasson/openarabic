import { withOpacity } from '../../utils/colorUtils';

describe('colorUtils', () => {
  describe('withOpacity', () => {
    it('should create rgba string with valid hex and opacity', () => {
      const result = withOpacity('#FF5500', 0.5);
      expect(result).toBe('rgba(255,85,0,0.5)');
    });

    it('should handle opacity values outside 0-1 range', () => {
      expect(withOpacity('#FF5500', -0.1)).toBe('rgba(255,85,0,0)');
      expect(withOpacity('#FF5500', 1.5)).toBe('rgba(255,85,0,1)');
    });

    it('should handle invalid opacity values', () => {
      expect(withOpacity('#FF5500', NaN)).toBe('rgba(255,85,0,1)');
      expect(withOpacity('#FF5500', Infinity)).toBe('rgba(255,85,0,1)');
    });

    it('should handle 3-digit hex colors', () => {
      const result = withOpacity('#F50', 0.8);
      expect(result).toBe('rgba(255,85,0,0.8)');
    });

    it('should handle hex colors with alpha', () => {
      const result = withOpacity('#FF5500AA', 0.5);
      expect(result).toBe('rgba(255,85,0,0.5)');
    });

    it('should handle invalid hex colors', () => {
      const result = withOpacity('invalid', 0.5);
      expect(result).toBe('rgba(0,0,0,0.5)');
    });

    it('should handle null/undefined hex colors', () => {
      expect(withOpacity(null as any, 0.5)).toBe('rgba(0,0,0,0.5)');
      expect(withOpacity(undefined as any, 0.5)).toBe('rgba(0,0,0,0.5)');
    });
  });
});
