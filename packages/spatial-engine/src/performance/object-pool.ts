/**
 * High-performance object pool for frequently allocated objects
 * Reduces garbage collection pressure during spatial navigation
 */

export interface Poolable {
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private createFn: () => T;
  private maxSize: number;

  constructor(createFn: () => T, initialSize = 10, maxSize = 1000) {
    this.createFn = createFn;
    this.maxSize = maxSize;

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn());
    }
  }

  acquire(): T {
    let obj = this.available.pop();
    
    if (!obj) {
      obj = this.createFn();
    }

    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      return; // Object not from this pool
    }

    this.inUse.delete(obj);
    obj.reset();

    // Don't exceed max pool size
    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }

  releaseAll(): void {
    for (const obj of this.inUse) {
      obj.reset();
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
    }
    this.inUse.clear();
  }

  getStats(): {
    available: number;
    inUse: number;
    total: number;
  } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }
}

// Poolable viewport for transition calculations
export class PooledViewport implements Poolable {
  x = 0;
  y = 0;
  zoom = 1;
  width = 0;
  height = 0;

  set(x: number, y: number, zoom: number, width: number, height: number): this {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.width = width;
    this.height = height;
    return this;
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.width = 0;
    this.height = 0;
  }
}

// Poolable bounding box for intersection tests
export class PooledBoundingBox implements Poolable {
  x = 0;
  y = 0;
  width = 0;
  height = 0;

  set(x: number, y: number, width: number, height: number): this {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    return this;
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }
}

// Global pools for common objects
export const viewportPool = new ObjectPool(() => new PooledViewport(), 20, 100);
export const boundingBoxPool = new ObjectPool(() => new PooledBoundingBox(), 50, 500);