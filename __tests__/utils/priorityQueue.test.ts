/**
 * Priority Queue Tests
 *
 * Tests priority queue data structure implementation.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { PriorityQueue } from '../../utils/priorityQueue';

describe('PriorityQueue', () => {
  test('orders items correctly when pushing and popping', () => {
    const queue = new PriorityQueue<string>();

    queue.push('a', 3);
    queue.push('b', 1);
    queue.push('c', 2);

    expect(queue.pop()).toBe('b');
    expect(queue.pop()).toBe('c');
    expect(queue.pop()).toBe('a');
  });

  test('maintains ordering when replacing the top element', () => {
    const queue = new PriorityQueue<string>();
    queue.push('a', 1);
    queue.push('b', 2);

    const removed = queue.replaceTop('c', 3);
    expect(removed).toBe('a');

    expect(queue.pop()).toBe('b');
    expect(queue.pop()).toBe('c');
  });

  test('heapify builds a valid heap from arrays', () => {
    const queue = new PriorityQueue<string>();
    queue.heapify(['a', 'b', 'c', 'd'], [3, 1, 4, 2]);

    expect(queue.pop()).toBe('b');
    expect(queue.pop()).toBe('d');
    expect(queue.pop()).toBe('a');
    expect(queue.pop()).toBe('c');
  });
});
