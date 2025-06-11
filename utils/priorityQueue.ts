export interface PriorityItem<T> {
  item: T;
  priority: number;
}

export class PriorityQueue<T> {
  private heap: PriorityItem<T>[] = [];

  constructor(private compare: (a: number, b: number) => number = (a, b) => a - b) {}

  private swap(i: number, j: number) {
    if (i >= this.heap.length || j >= this.heap.length) return;
    const temp = this.heap[i];
    const itemJ = this.heap[j];
    if (!temp || !itemJ) return;
    this.heap[i] = itemJ;
    this.heap[j] = temp;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const current = this.heap[index];
      const parentItem = this.heap[parent];
      if (current && parentItem && this.compare(current.priority, parentItem.priority) < 0) {
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
      const left = index * 2 + 1;
      const right = index * 2 + 2;
      let smallest = index;

      const leftItem = this.heap[left];
      const rightItem = this.heap[right];
      const smallestItem = this.heap[smallest];

      if (
        left < length &&
        leftItem &&
        smallestItem &&
        this.compare(leftItem.priority, smallestItem.priority) < 0
      ) {
        smallest = left;
      }

      const updatedSmallestItem = this.heap[smallest];
      if (
        right < length &&
        rightItem &&
        updatedSmallestItem &&
        this.compare(rightItem.priority, updatedSmallestItem.priority) < 0
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
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const rootItem = this.heap[0];
    if (!rootItem) return undefined;
    const root = rootItem.item;
    const end = this.heap.pop();
    if (this.heap.length > 0 && end) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }
    return root;
  }

  peek(): T | undefined {
    return this.heap[0]?.item;
  }

  size(): number {
    return this.heap.length;
  }

  toArray(): T[] {
    return this.heap
      .slice()
      .sort((a, b) => this.compare(a.priority, b.priority))
      .map(el => el.item);
  }
}
