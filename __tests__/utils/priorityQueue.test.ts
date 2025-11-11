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

  test('clone creates an independent copy', () => {
    const queue = new PriorityQueue<string>();
    queue.heapify(['a', 'b'], [1, 2]);

    const cloned = queue.clone();

    // Mutate original
    queue.pop();

    // Mutate clone
    cloned.push('c', 0);

    expect(queue.size()).toBe(1);
    expect(cloned.size()).toBe(3);
    expect(queue.peek()).toBe('b');
    expect(cloned.pop()).toBe('c');
    expect(cloned.pop()).toBe('a');
  });

  test('trims internal arrays after many pops', () => {
    const queue = new PriorityQueue<number>();
    for (let i = 0; i < 100; i++) {
      queue.push(i, i);
    }

    queue.trim();
    const oldHeap = (queue as any).heap;
    const oldPriorities = (queue as any).priorities;

    for (let i = 0; i < 75; i++) {
      queue.pop();
    }

    queue.trim();

    expect((queue as any).heap.length).toBe(25);
    expect((queue as any).heap).not.toBe(oldHeap);
    expect((queue as any).priorities).not.toBe(oldPriorities);
  });
});
