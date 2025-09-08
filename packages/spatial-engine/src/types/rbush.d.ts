declare module 'rbush' {
  export default class RBush<T = any> {
    constructor(maxEntries?: number);
    clear(): RBush<T>;
    search(bbox: { minX: number; minY: number; maxX: number; maxY: number }): T[];
    insert(item: T): RBush<T>;
    load(items: T[]): RBush<T>;
    remove(item: T): RBush<T>;
    all(): T[];
  }
}