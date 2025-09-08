/**
 * 3D Object Pooling System
 * High-performance object reuse to eliminate GC pressure
 */

import type { BoundingBox } from '@fir/penpot-parser';

export interface BoundingBox3D extends BoundingBox {
  zMin: number;
  zMax: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Frustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
}

interface PoolStats {
  created: number;
  reused: number;
  maxSize: number;
  currentSize: number;
}

/**
 * Generic object pool base class
 */
abstract class ObjectPool<T> {
  protected pool: T[] = [];
  protected maxSize: number;
  protected stats: PoolStats;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.stats = {
      created: 0,
      reused: 0,
      maxSize,
      currentSize: 0,
    };
  }

  abstract create(): T;
  abstract reset(obj: T): void;

  acquire(): T {
    let obj = this.pool.pop();
    
    if (obj) {
      this.stats.reused++;
      this.stats.currentSize--;
    } else {
      obj = this.create();
      this.stats.created++;
    }

    this.reset(obj);
    return obj;
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
      this.stats.currentSize++;
    }
  }

  getStats(): PoolStats {
    return { ...this.stats };
  }

  clear(): void {
    this.pool.length = 0;
    this.stats.currentSize = 0;
  }

  warmUp(count: number): void {
    for (let i = 0; i < count; i++) {
      this.release(this.create());
    }
  }
}

/**
 * 3D Bounding Box Pool
 */
export class BoundingBox3DPool extends ObjectPool<BoundingBox3D> {
  create(): BoundingBox3D {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zMin: 0,
      zMax: 0,
    };
  }

  reset(bounds: BoundingBox3D): void {
    bounds.x = 0;
    bounds.y = 0;
    bounds.width = 0;
    bounds.height = 0;
    bounds.zMin = 0;
    bounds.zMax = 0;
  }

  setBounds(bounds: BoundingBox3D, x: number, y: number, width: number, height: number, zMin: number, zMax: number): BoundingBox3D {
    bounds.x = x;
    bounds.y = y;
    bounds.width = width;
    bounds.height = height;
    bounds.zMin = zMin;
    bounds.zMax = zMax;
    return bounds;
  }
}

/**
 * 3D Point Pool
 */
export class Point3DPool extends ObjectPool<Point3D> {
  create(): Point3D {
    return { x: 0, y: 0, z: 0 };
  }

  reset(point: Point3D): void {
    point.x = 0;
    point.y = 0;
    point.z = 0;
  }

  setPoint(point: Point3D, x: number, y: number, z: number): Point3D {
    point.x = x;
    point.y = y;
    point.z = z;
    return point;
  }
}

/**
 * Frustum Pool
 */
export class FrustumPool extends ObjectPool<Frustum> {
  create(): Frustum {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      near: 0,
      far: 0,
    };
  }

  reset(frustum: Frustum): void {
    frustum.left = 0;
    frustum.right = 0;
    frustum.top = 0;
    frustum.bottom = 0;
    frustum.near = 0;
    frustum.far = 0;
  }

  setFrustum(frustum: Frustum, left: number, right: number, top: number, bottom: number, near: number, far: number): Frustum {
    frustum.left = left;
    frustum.right = right;
    frustum.top = top;
    frustum.bottom = bottom;
    frustum.near = near;
    frustum.far = far;
    return frustum;
  }
}

/**
 * Array Pool for reusing arrays
 */
export class ArrayPool<T> extends ObjectPool<T[]> {
  create(): T[] {
    return [];
  }

  reset(arr: T[]): void {
    arr.length = 0;
  }
}

/**
 * Distance Cache Entry Pool
 */
interface DistanceCacheEntry {
  distance: number;
  viewerX: number;
  viewerY: number;
  viewerZ: number;
  lastUpdate: number;
}

export class DistanceCacheEntryPool extends ObjectPool<DistanceCacheEntry> {
  create(): DistanceCacheEntry {
    return {
      distance: 0,
      viewerX: 0,
      viewerY: 0,
      viewerZ: 0,
      lastUpdate: 0,
    };
  }

  reset(entry: DistanceCacheEntry): void {
    entry.distance = 0;
    entry.viewerX = 0;
    entry.viewerY = 0;
    entry.viewerZ = 0;
    entry.lastUpdate = 0;
  }

  setEntry(entry: DistanceCacheEntry, distance: number, viewerX: number, viewerY: number, viewerZ: number): DistanceCacheEntry {
    entry.distance = distance;
    entry.viewerX = viewerX;
    entry.viewerY = viewerY;
    entry.viewerZ = viewerZ;
    entry.lastUpdate = performance.now();
    return entry;
  }
}

/**
 * Global Pool Manager
 * Centralized management of all object pools
 */
export class PoolManager {
  private static instance: PoolManager;
  
  private boundingBox3DPool: BoundingBox3DPool;
  private point3DPool: Point3DPool;
  private frustumPool: FrustumPool;
  private arrayPool: ArrayPool<any>;
  private distanceCacheEntryPool: DistanceCacheEntryPool;

  private constructor() {
    this.boundingBox3DPool = new BoundingBox3DPool(500);
    this.point3DPool = new Point3DPool(200);
    this.frustumPool = new FrustumPool(50);
    this.arrayPool = new ArrayPool(100);
    this.distanceCacheEntryPool = new DistanceCacheEntryPool(1000);

    // Warm up pools
    this.warmUpPools();
  }

  static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager();
    }
    return PoolManager.instance;
  }

  getBoundingBox3DPool(): BoundingBox3DPool {
    return this.boundingBox3DPool;
  }

  getPoint3DPool(): Point3DPool {
    return this.point3DPool;
  }

  getFrustumPool(): FrustumPool {
    return this.frustumPool;
  }

  getArrayPool(): ArrayPool<any> {
    return this.arrayPool;
  }

  getDistanceCacheEntryPool(): DistanceCacheEntryPool {
    return this.distanceCacheEntryPool;
  }

  private warmUpPools(): void {
    this.boundingBox3DPool.warmUp(50);
    this.point3DPool.warmUp(20);
    this.frustumPool.warmUp(5);
    this.arrayPool.warmUp(10);
    this.distanceCacheEntryPool.warmUp(100);
  }

  getGlobalStats(): Record<string, PoolStats> {
    return {
      boundingBox3D: this.boundingBox3DPool.getStats(),
      point3D: this.point3DPool.getStats(),
      frustum: this.frustumPool.getStats(),
      array: this.arrayPool.getStats(),
      distanceCacheEntry: this.distanceCacheEntryPool.getStats(),
    };
  }

  clearAllPools(): void {
    this.boundingBox3DPool.clear();
    this.point3DPool.clear();
    this.frustumPool.clear();
    this.arrayPool.clear();
    this.distanceCacheEntryPool.clear();
  }
}

// Convenience functions for easy access
export const getPoolManager = () => PoolManager.getInstance();
export const getBoundingBox3DPool = () => getPoolManager().getBoundingBox3DPool();
export const getPoint3DPool = () => getPoolManager().getPoint3DPool();
export const getFrustumPool = () => getPoolManager().getFrustumPool();
export const getArrayPool = () => getPoolManager().getArrayPool();
export const getDistanceCacheEntryPool = () => getPoolManager().getDistanceCacheEntryPool();