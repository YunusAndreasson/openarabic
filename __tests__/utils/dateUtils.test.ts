import { parseSupabaseTimestamp } from '@/utils/dateUtils';

describe('dateUtils', () => {
  describe('parseSupabaseTimestamp', () => {
    it('should parse timestamp with space and +00 timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15 12:00:00+00');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should parse ISO 8601 timestamp with Z', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00Z');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should parse timestamp without timezone (assume UTC)', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should parse timestamp with space but no timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15 12:00:00');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.000Z');
    });

    it('should return null for null input', () => {
      const result = parseSupabaseTimestamp(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = parseSupabaseTimestamp(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseSupabaseTimestamp('');
      expect(result).toBeNull();
    });

    it('should return null for invalid timestamp', () => {
      const result = parseSupabaseTimestamp('invalid-date');
      expect(result).toBeNull();
    });

    it('should handle timestamps with milliseconds', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00.123Z');
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe('2024-01-15T12:00:00.123Z');
    });

    it('should handle timestamps with +HH:MM timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00+05:30');
      expect(result).not.toBeNull();
      // Should be 6:30 UTC (12:00 - 5:30)
      expect(result?.toISOString()).toBe('2024-01-15T06:30:00.000Z');
    });

    it('should handle timestamps with -HH:MM timezone', () => {
      const result = parseSupabaseTimestamp('2024-01-15T12:00:00-05:00');
      expect(result).not.toBeNull();
      // Should be 17:00 UTC (12:00 + 5:00)
      expect(result?.toISOString()).toBe('2024-01-15T17:00:00.000Z');
    });

    it('should normalize +00 to Z', () => {
      const withPlus00 = parseSupabaseTimestamp('2024-01-15 12:00:00+00');
      const withZ = parseSupabaseTimestamp('2024-01-15T12:00:00Z');
      expect(withPlus00?.toISOString()).toBe(withZ?.toISOString());
    });
  });
});
