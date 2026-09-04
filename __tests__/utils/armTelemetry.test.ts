import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import {
  getArmStages,
  markArmTap,
  markRestoreEnd,
  markRestoreModeReady,
  markRestoreStart,
  resetArmTelemetry,
} from '@/utils/armTelemetry';

describe('audio restore timing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    resetArmTelemetry();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a tap during input opening retains both portions of the restore', () => {
    markRestoreStart();
    jest.advanceTimersByTime(250);
    markRestoreModeReady();
    jest.advanceTimersByTime(100);
    markArmTap();
    jest.advanceTimersByTime(650);
    markRestoreEnd();

    expect(getArmStages()).toMatchObject({
      restorePendingAtTap: true,
      restoreMs: 1000,
      restoreModeMs: 250,
      restoreInputMs: 750,
    });
  });

  test('a tap after the restore retains its completed breakdown', () => {
    markRestoreStart();
    jest.advanceTimersByTime(200);
    markRestoreModeReady();
    jest.advanceTimersByTime(800);
    markRestoreEnd();
    markArmTap();

    expect(getArmStages()).toMatchObject({
      restorePendingAtTap: false,
      restoreMs: 1000,
      restoreModeMs: 200,
      restoreInputMs: 800,
    });
  });

  test('an incomplete restore does not inherit the previous input timing', () => {
    markRestoreStart();
    markRestoreModeReady();
    jest.advanceTimersByTime(800);
    markRestoreEnd();
    markRestoreStart();
    markArmTap();
    jest.advanceTimersByTime(100);
    markRestoreEnd();

    expect(getArmStages()).toMatchObject({
      restoreMs: 100,
      restoreModeMs: null,
      restoreInputMs: null,
    });
    resetArmTelemetry();
    markArmTap();
    expect(getArmStages()).toMatchObject({
      restoreMs: null,
      restoreModeMs: null,
      restoreInputMs: null,
    });
  });
});
