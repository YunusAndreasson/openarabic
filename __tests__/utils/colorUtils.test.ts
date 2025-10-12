import { oklchToHex, withOpacity } from '../../utils/colorUtils';

describe('colorUtils', () => {
  describe('oklchToHex', () => {
    it('should convert OKLCH to hex with gamut clamping', () => {
      // Sage green example from docs
      const result = oklchToHex(0.55, 0.08, 155);
      expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should clamp out-of-gamut colors to displayable RGB', () => {
      // Very high chroma that might be out of gamut
      const result = oklchToHex(0.5, 0.5, 180);
      expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should handle edge cases', () => {
      expect(oklchToHex(0, 0, 0)).toMatch(/^#[0-9A-F]{6}$/i); // Black
      expect(oklchToHex(1, 0, 0)).toMatch(/^#[0-9A-F]{6}$/i); // White
    });
  });

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
