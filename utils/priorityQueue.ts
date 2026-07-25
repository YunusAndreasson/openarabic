import { STRINGS } from '@/constants/strings';

export class PriorityQueue<T> {
  private heap: T[] = [];
  private priorities: number[] = [];

  constructor(private compare: (a: number, b: number) => number = (a, b) => a - b) {}

  private swap(i: number, j: number) {
    if (i >= this.heap.length || j >= this.heap.length || i < 0 || j < 0) return;

    const itemI = this.heap[i];
    const itemJ = this.heap[j];
    const priorityI = this.priorities[i];
    const priorityJ = this.priorities[j];

    // Read and validate BEFORE mutating, so the swap is all-or-nothing. The
    // previous order swapped the items first and could then bail out before
    // swapping the priorities, permanently desyncing the two parallel arrays.
    // (These undefined checks exist to satisfy noUncheckedIndexedAccess — the
    // heap is not expected to contain holes — but the ordering still mattered.)
    if (itemI === undefined || itemJ === undefined) return;
    if (priorityI === undefined || priorityJ === undefined) return;

    this.heap[i] = itemJ;
    this.heap[j] = itemI;
    this.priorities[i] = priorityJ;
    this.priorities[j] = priorityI;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = (index - 1) >> 1; // Bit shift for division by 2
      const currentPriority = this.priorities[index];
      const parentPriority = this.priorities[parent];

      if (
        currentPriority !== undefined &&
        parentPriority !== undefined &&
        this.compare(currentPriority, parentPriority) < 0
      ) {
        this.swap(index, parent);
        index = parent;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number) {
    const length = this.heap.length;
    while (true) {
      const left = (index << 1) + 1; // Bit shift for multiplication by 2
      const right = left + 1;
      let smallest = index;

      const smallestPriority = this.priorities[smallest];
      const leftPriority = this.priorities[left];
      const rightPriority = this.priorities[right];

      if (
        left < length &&
        leftPriority !== undefined &&
        smallestPriority !== undefined &&
        this.compare(leftPriority, smallestPriority) < 0
      ) {
        smallest = left;
      }

      const updatedSmallestPriority = this.priorities[smallest];
      if (
        right < length &&
        rightPriority !== undefined &&
        updatedSmallestPriority !== undefined &&
        this.compare(rightPriority, updatedSmallestPriority) < 0
      ) {
        smallest = right;
      }

      if (smallest !== index) {
        this.swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  push(item: T, priority: number) {
    this.heap.push(item);
    this.priorities.push(priority);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;

    const root = this.heap[0];
    const lastItem = this.heap.pop();
    const lastPriority = this.priorities.pop();

    if (this.heap.length > 0 && lastItem !== undefined && lastPriority !== undefined) {
      this.heap[0] = lastItem;
      this.priorities[0] = lastPriority;
      this.bubbleDown(0);
    }

    return root;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  // New optimized method: replace top element in one operation
  replaceTop(item: T, priority: number): T | undefined {
    if (this.heap.length === 0) {
      this.push(item, priority);
      return undefined;
    }

    const root = this.heap[0];
    this.heap[0] = item;
    this.priorities[0] = priority;
    this.bubbleDown(0);
    return root;
  }

  // New method: efficiently convert array to heap
  heapify(items: T[], priorities: number[]) {
    if (items.length !== priorities.length) {
      throw new Error(STRINGS.ERROR_PRIORITY_QUEUE_LENGTH_MISMATCH);
    }

    this.heap = [...items];
    this.priorities = [...priorities];

    // Start from the last non-leaf node and bubble down
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.bubbleDown(i);
    }
  }

  toArray(): T[] {
    // Create array of indices and sort by priority
    const indices = Array.from({ length: this.heap.length }, (_, i) => i);
    indices.sort((a, b) => {
      const priorityA = this.priorities[a];
      const priorityB = this.priorities[b];
      if (priorityA === undefined || priorityB === undefined) return 0;
      return this.compare(priorityA, priorityB);
    });
    return indices.map(i => this.heap[i]).filter((item): item is T => item !== undefined);
  }
}
