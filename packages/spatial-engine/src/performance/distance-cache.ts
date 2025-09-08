/**
 * Distance Calculation Cache
 * Caches expensive distance calculations with spatial awareness
 */

import { getDistanceCacheEntryPool, type BoundingBox3D } from './object-pool-3d.js';

interface DistanceCacheEntry {
  distance: number;
  viewerX: number;
  viewerY: number;
  viewerZ: number;
  lastUpdate: number;
}

export class DistanceCache {
  private cache = new Map<string, DistanceCacheEntry>();
  private maxCacheSize = 10000;
  private cacheTimeout = 100; // ms - cache entries valid for 100ms
  private hitCount = 0;
  private missCount = 0;
  private cleanupInterval: number | null = null;

  constructor(maxSize = 10000, timeout = 100) {
    this.maxCacheSize = maxSize;
    this.cacheTimeout = timeout;
    
    // Periodic cleanup
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup();
    }, 1000);
  }

  /**
   * Get cached distance or calculate and cache it
   */
  getDistance(
    elementId: string,
    bounds: BoundingBox3D,
    viewerX: number,
    viewerY: number,
    viewerZ: number
  ): number {
    const cached = this.cache.get(elementId);
    const now = performance.now();
    
    // Check if cache hit is valid
    if (cached && this.isCacheValid(cached, viewerX, viewerY, viewerZ, now)) {
      this.hitCount++;
      return cached.distance;
    }

    // Calculate distance
    const elementCenterX = bounds.x + bounds.width / 2;
    const elementCenterY = bounds.y + bounds.height / 2;
    const elementCenterZ = (bounds.zMin + bounds.zMax) / 2;
    
    const dx = elementCenterX - viewerX;
    const dy = elementCenterY - viewerY;
    const dz = elementCenterZ - viewerZ;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Cache the result
    this.setCachedDistance(elementId, distance, viewerX, viewerY, viewerZ, now);
    this.missCount++;
    
    return distance;
  }

  /**
   * Fast 2D distance for elements without Z
   */
  getDistance2D(
    elementId: string,
    elementX: number,
    elementY: number,
    viewerX: number,
    viewerY: number
  ): number {
    const cached = this.cache.get(elementId);
    const now = performance.now();
    
    if (cached && this.isCacheValid2D(cached, viewerX, viewerY, now)) {
      this.hitCount++;
      return cached.distance;
    }

    const dx = elementX - viewerX;
    const dy = elementY - viewerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    this.setCachedDistance(elementId, distance, viewerX, viewerY, 0, now);
    this.missCount++;
    
    return distance;
  }

  /**
   * Manhattan distance (faster approximation)
   */
  getManhattanDistance(
    elementId: string,
    bounds: BoundingBox3D,
    viewerX: number,
    viewerY: number,
    viewerZ: number
  ): number {
    const cached = this.cache.get(elementId);
    const now = performance.now();
    
    if (cached && this.isCacheValid(cached, viewerX, viewerY, viewerZ, now)) {
      this.hitCount++;
      return cached.distance;
    }

    const elementCenterX = bounds.x + bounds.width / 2;
    const elementCenterY = bounds.y + bounds.height / 2;
    const elementCenterZ = (bounds.zMin + bounds.zMax) / 2;
    
    const distance = Math.abs(elementCenterX - viewerX) + 
                    Math.abs(elementCenterY - viewerY) + 
                    Math.abs(elementCenterZ - viewerZ);
    
    this.setCachedDistance(elementId, distance, viewerX, viewerY, viewerZ, now);
    this.missCount++;
    
    return distance;
  }

  /**
   * Batch distance calculation with spatial optimizations
   */
  getBatchDistances(
    elements: Array<{ id: string; bounds: BoundingBox3D }>,
    viewerX: number,
    viewerY: number,
    viewerZ: number
  ): Map<string, number> {
    const results = new Map<string, number>();
    const uncachedElements: Array<{ id: string; bounds: BoundingBox3D }> = [];
    const now = performance.now();

    // Check cache first
    for (const element of elements) {
      const cached = this.cache.get(element.id);
      
      if (cached && this.isCacheValid(cached, viewerX, viewerY, viewerZ, now)) {
        results.set(element.id, cached.distance);
        this.hitCount++;
      } else {
        uncachedElements.push(element);
      }
    }

    // Calculate uncached distances in batch
    if (uncachedElements.length > 0) {
      this.calculateBatchDistances(uncachedElements, viewerX, viewerY, viewerZ, now, results);
    }

    return results;
  }

  private calculateBatchDistances(
    elements: Array<{ id: string; bounds: BoundingBox3D }>,
    viewerX: number,
    viewerY: number,
    viewerZ: number,
    timestamp: number,
    results: Map<string, number>
  ): void {
    // Use SIMD-like batch processing where possible
    for (const element of elements) {
      const bounds = element.bounds;
      const elementCenterX = bounds.x + bounds.width / 2;
      const elementCenterY = bounds.y + bounds.height / 2;
      const elementCenterZ = (bounds.zMin + bounds.zMax) / 2;
      
      const dx = elementCenterX - viewerX;
      const dy = elementCenterY - viewerY;
      const dz = elementCenterZ - viewerZ;
      
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      results.set(element.id, distance);
      this.setCachedDistance(element.id, distance, viewerX, viewerY, viewerZ, timestamp);
      this.missCount++;
    }
  }

  private setCachedDistance(
    elementId: string,
    distance: number,
    viewerX: number,
    viewerY: number,
    viewerZ: number,
    timestamp: number
  ): void {
    // Check if we need to evict old entries
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldEntries();
    }

    let entry = this.cache.get(elementId);
    
    if (entry) {
      // Reuse existing entry
      entry.distance = distance;
      entry.viewerX = viewerX;
      entry.viewerY = viewerY;
      entry.viewerZ = viewerZ;
      entry.lastUpdate = timestamp;
    } else {
      // Create new entry (reuse from pool if available)
      const poolManager = getDistanceCacheEntryPool();
      entry = poolManager.acquire();
      poolManager.setEntry(entry, distance, viewerX, viewerY, viewerZ);
      
      this.cache.set(elementId, entry);
    }
  }

  private isCacheValid(
    cached: DistanceCacheEntry,
    viewerX: number,
    viewerY: number,
    viewerZ: number,
    now: number
  ): boolean {
    // Check timeout
    if (now - cached.lastUpdate > this.cacheTimeout) {
      return false;
    }

    // Check if viewer moved significantly
    const threshold = 0.5; // Cache valid if viewer moved less than 0.5 units
    const dx = Math.abs(cached.viewerX - viewerX);
    const dy = Math.abs(cached.viewerY - viewerY);
    const dz = Math.abs(cached.viewerZ - viewerZ);

    return dx < threshold && dy < threshold && dz < threshold;
  }

  private isCacheValid2D(
    cached: DistanceCacheEntry,
    viewerX: number,
    viewerY: number,
    now: number
  ): boolean {
    if (now - cached.lastUpdate > this.cacheTimeout) {
      return false;
    }

    const threshold = 0.5;
    const dx = Math.abs(cached.viewerX - viewerX);
    const dy = Math.abs(cached.viewerY - viewerY);

    return dx < threshold && dy < threshold;
  }

  private evictOldEntries(): void {
    const now = performance.now();
    const entriesToRemove: string[] = [];
    const poolManager = getDistanceCacheEntryPool();

    // Remove entries older than timeout
    for (const [id, entry] of this.cache) {
      if (now - entry.lastUpdate > this.cacheTimeout * 2) {
        entriesToRemove.push(id);
        poolManager.release(entry);
      }
    }

    for (const id of entriesToRemove) {
      this.cache.delete(id);
    }

    // If still too large, remove oldest entries
    if (this.cache.size >= this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastUpdate - b[1].lastUpdate);

      const removeCount = Math.floor(this.maxCacheSize * 0.1); // Remove 10%
      for (let i = 0; i < removeCount && i < entries.length; i++) {
        const [id, entry] = entries[i];
        this.cache.delete(id);
        poolManager.release(entry);
      }
    }
  }

  private cleanup(): void {
    this.evictOldEntries();
  }

  /**
   * Performance and debugging methods
   */
  getStats(): {
    cacheSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    maxSize: number;
    timeout: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      cacheSize: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
      maxSize: this.maxCacheSize,
      timeout: this.cacheTimeout,
    };
  }

  clear(): void {
    const poolManager = getDistanceCacheEntryPool();
    
    for (const entry of this.cache.values()) {
      poolManager.release(entry);
    }
    
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clear();
  }

  // Advanced cache warming for predictable access patterns
  warmCache(
    elementIds: string[],
    bounds: BoundingBox3D[],
    viewerPositions: Array<{ x: number; y: number; z: number }>
  ): void {
    const now = performance.now();
    
    for (let i = 0; i < elementIds.length; i++) {
      const elementId = elementIds[i];
      const elementBounds = bounds[i];
      
      for (const viewerPos of viewerPositions) {
        const distance = this.getDistance(
          elementId,
          elementBounds,
          viewerPos.x,
          viewerPos.y,
          viewerPos.z
        );
      }
    }
  }
}

// Global cache instance
let globalDistanceCache: DistanceCache | null = null;

export function getDistanceCache(): DistanceCache {
  if (!globalDistanceCache) {
    globalDistanceCache = new DistanceCache();
  }
  return globalDistanceCache;
}

export function destroyDistanceCache(): void {
  if (globalDistanceCache) {
    globalDistanceCache.destroy();
    globalDistanceCache = null;
  }
}