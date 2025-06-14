import { PriorityQueue } from '../../utils/priorityQueue';

describe('PriorityQueue', () => {
  it('orders items correctly when pushing and popping', () => {
    const queue = new PriorityQueue<string>();

    queue.push('a', 3);
    queue.push('b', 1);
    queue.push('c', 2);

    expect(queue.pop()).toBe('b');
    expect(queue.pop()).toBe('c');
    expect(queue.pop()).toBe('a');
  });

  it('maintains ordering when replacing the top element', () => {
    const queue = new PriorityQueue<string>();
    queue.push('a', 1);
    queue.push('b', 2);

    const removed = queue.replaceTop('c', 3);
    expect(removed).toBe('a');

    expect(queue.pop()).toBe('b');
    expect(queue.pop()).toBe('c');
  });

  it('heapify builds a valid heap from arrays', () => {
    const queue = new PriorityQueue<string>();
    queue.heapify(['a', 'b', 'c', 'd'], [3, 1, 4, 2]);

    expect(queue.pop()).toBe('b');
    expect(queue.pop()).toBe('d');
    expect(queue.pop()).toBe('a');
    expect(queue.pop()).toBe('c');
  });

  it('clone creates an independent copy', () => {
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
});
