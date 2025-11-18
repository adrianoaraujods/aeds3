export class Queue<T> {
  private elements: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  enqueue(element: T): void {
    this.elements.push(element);
    this.elements.sort(this.comparator);
  }

  dequeue(): T | undefined {
    return this.elements.shift();
  }

  size(): number {
    return this.elements.length;
  }
}
