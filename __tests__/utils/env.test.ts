/**
 * Environment Variable Utilities Tests
 *
 * Tests environment variable access and validation utilities.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - modifies shared process.env state
 * - Note: No jest.mocked() needed - no mocks used
 */

import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { getEnvVar, getRequiredEnvVar, hasEnvVar } from '@/utils/env';

describe('env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  describe('getEnvVar', () => {
    test('should return environment variable value when it exists', () => {
      process.env.TEST_VAR = 'test-value';
      const result = getEnvVar('TEST_VAR');
      expect(result).toBe('test-value');
    });

    test('should return fallback when environment variable does not exist', () => {
      delete process.env.MISSING_VAR;
      const result = getEnvVar('MISSING_VAR', 'fallback-value');
      expect(result).toBe('fallback-value');
    });

    test('should return undefined when no fallback provided and variable does not exist', () => {
      delete process.env.MISSING_VAR;
      const result = getEnvVar('MISSING_VAR');
      expect(result).toBeUndefined();
    });

    test('should prefer environment variable over fallback', () => {
      process.env.TEST_VAR = 'env-value';
      const result = getEnvVar('TEST_VAR', 'fallback-value');
      expect(result).toBe('env-value');
    });

    test('should handle empty string environment variable', () => {
      process.env.EMPTY_VAR = '';
      const result = getEnvVar('EMPTY_VAR', 'fallback-value');
      expect(result).toBe('fallback-value');
    });

    test('should handle warnIfMissing flag without throwing', () => {
      delete process.env.MISSING_VAR;
      // Should not throw even with warnIfMissing=true
      expect(() => {
        getEnvVar('MISSING_VAR', undefined, true);
      }).not.toThrow();
    });

    test('should return fallback with warnIfMissing flag', () => {
      delete process.env.MISSING_VAR;
      const result = getEnvVar('MISSING_VAR', 'fallback-value', true);
      expect(result).toBe('fallback-value');
    });
  });

  describe('getRequiredEnvVar', () => {
    test('should return environment variable value when it exists', () => {
      process.env.REQUIRED_VAR = 'required-value';
      const result = getRequiredEnvVar('REQUIRED_VAR');
      expect(result).toBe('required-value');
    });

    test('should throw error when environment variable does not exist', () => {
      delete process.env.MISSING_REQUIRED_VAR;
      expect(() => {
        getRequiredEnvVar('MISSING_REQUIRED_VAR');
      }).toThrow('Required environment variable MISSING_REQUIRED_VAR is not set');
    });

    test('should throw custom error message when provided', () => {
      delete process.env.MISSING_REQUIRED_VAR;
      expect(() => {
        getRequiredEnvVar('MISSING_REQUIRED_VAR', 'Custom error: variable is required');
      }).toThrow('Custom error: variable is required');
    });

    test('should throw error for empty string environment variable', () => {
      process.env.EMPTY_REQUIRED_VAR = '';
      expect(() => {
        getRequiredEnvVar('EMPTY_REQUIRED_VAR');
      }).toThrow('Required environment variable EMPTY_REQUIRED_VAR is not set');
    });

    test('should return non-empty environment variable', () => {
      process.env.REQUIRED_VAR = 'valid-value';
      const result = getRequiredEnvVar('REQUIRED_VAR');
      expect(result).toBe('valid-value');
    });
  });

  describe('hasEnvVar', () => {
    test('should return true when environment variable exists and has value', () => {
      process.env.EXISTS_VAR = 'some-value';
      const result = hasEnvVar('EXISTS_VAR');
      expect(result).toBe(true);
    });

    test('should return false when environment variable does not exist', () => {
      delete process.env.MISSING_VAR;
      const result = hasEnvVar('MISSING_VAR');
      expect(result).toBe(false);
    });

    test('should return false when environment variable is empty string', () => {
      process.env.EMPTY_VAR = '';
      const result = hasEnvVar('EMPTY_VAR');
      expect(result).toBe(false);
    });

    test('should return false when environment variable is only whitespace', () => {
      process.env.WHITESPACE_VAR = '   ';
      const result = hasEnvVar('WHITESPACE_VAR');
      expect(result).toBe(false);
    });

    test('should return true for environment variable with whitespace but also content', () => {
      process.env.PADDED_VAR = '  value  ';
      const result = hasEnvVar('PADDED_VAR');
      expect(result).toBe(true);
    });

    test('should return true for numeric string values', () => {
      process.env.NUMERIC_VAR = '123';
      const result = hasEnvVar('NUMERIC_VAR');
      expect(result).toBe(true);
    });

    test('should return true for boolean string values', () => {
      process.env.BOOLEAN_VAR = 'false';
      const result = hasEnvVar('BOOLEAN_VAR');
      expect(result).toBe(true);
    });
  });
});
