export interface PriorityItem<T> {
  item: T;
  priority: number;
}

export class PriorityQueue<T> {
  private heap: PriorityItem<T>[] = [];

  constructor(private compare: (a: number, b: number) => number = (a, b) => a - b) {}

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index].priority, this.heap[parent].priority) < 0) {
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

      if (
        left < length &&
        this.compare(this.heap[left].priority, this.heap[smallest].priority) < 0
      ) {
        smallest = left;
      }

      if (
        right < length &&
        this.compare(this.heap[right].priority, this.heap[smallest].priority) < 0
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
    const root = this.heap[0].item;
    const end = this.heap.pop()!;
    if (this.heap.length > 0) {
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
