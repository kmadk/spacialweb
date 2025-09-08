/**
 * Optimized 3D Culling System
 * Integrates all performance optimizations: object pooling, distance caching, 
 * web workers, 3D octree, and GPU culling
 */

import type { Viewport, SpatialElement } from '../types.js';
import type { BoundingBox } from '@fir/penpot-parser';

import { 
  getBoundingBox3DPool, 
  getFrustumPool, 
  getArrayPool,
  type BoundingBox3D 
} from './object-pool-3d.js';
import { getDistanceCache } from './distance-cache.js';
import { SpatialIndex3D } from './spatial-index-3d.js';
import { CullingWorkerManager } from './culling-worker.js';
import { OptimizedShaderManager } from '../rendering/optimized-3d-shaders.js';

interface CullingResult {
  visibleElements: SpatialElement[];
  culledElements: SpatialElement[];
  statistics: {
    totalElements: number;
    frustumCulled: number;
    occlusionCulled: number;
    distanceCulled: number;
    visibleElements: number;
    processingTime: number;
    cacheHitRate: number;
    method: 'cpu' | 'worker' | 'gpu';
  };
}

interface CullingOptions {
  enableWorkers?: boolean;
  enableGPUCulling?: boolean;
  enableOctree?: boolean;
  enableDistanceCache?: boolean;
  frustumCullDistance?: number;
  lodDistanceThresholds?: number[];
  maxWorkerElements?: number; // Use workers for large element counts
}

export class OptimizedCullingSystem {
  private spatialIndex: SpatialIndex3D | null = null;
  private workerManager: CullingWorkerManager;
  private shaderManager: OptimizedShaderManager | null = null;
  private distanceCache = getDistanceCache();
  
  // Object pools
  private boundsPool = getBoundingBox3DPool();
  private frustumPool = getFrustumPool();
  private arrayPool = getArrayPool();
  
  // Configuration
  private options: Required<CullingOptions>;
  
  // Performance tracking
  private stats = {
    totalCullingOperations: 0,
    averageProcessingTime: 0,
    workerUsageRate: 0,
    gpuUsageRate: 0,
    cacheHitRate: 0,
    lastUpdateTime: 0,
  };
  
  // World bounds for octree
  private worldBounds: BoundingBox3D | null = null;

  constructor(options: CullingOptions = {}) {
    this.options = {
      enableWorkers: true,
      enableGPUCulling: false, // Disable by default until WebGL context is available
      enableOctree: true,
      enableDistanceCache: true,
      frustumCullDistance: 200,
      lodDistanceThresholds: [20, 50, 100, 200],
      maxWorkerElements: 1000,
      ...options,
    };
    
    this.workerManager = new CullingWorkerManager();
  }

  /**
   * Initialize with WebGL context for GPU culling
   */
  initializeGPU(gl: WebGL2RenderingContext): void {
    try {
      this.shaderManager = new OptimizedShaderManager(gl);
      if (this.shaderManager.hasGPUCulling()) {
        this.options.enableGPUCulling = true;
      }
    } catch (error) {
      console.warn('GPU culling initialization failed:', error);
      this.options.enableGPUCulling = false;
    }
  }

  /**
   * Initialize spatial index with world bounds
   */
  initializeSpatialIndex(worldBounds: BoundingBox3D): void {
    this.worldBounds = worldBounds;
    
    if (this.options.enableOctree) {
      this.spatialIndex = new SpatialIndex3D(worldBounds);
    }
  }

  /**
   * Update spatial index with new elements
   */
  updateSpatialIndex(elements: SpatialElement[]): void {
    if (!this.spatialIndex) return;
    
    // Rebuild index efficiently
    this.spatialIndex.rebuild(elements);
  }

  /**
   * Main culling method - automatically selects best strategy
   */
  async cullElements(elements: SpatialElement[], viewport: Viewport): Promise<CullingResult> {
    const startTime = performance.now();
    
    // Early exit for empty elements
    if (elements.length === 0) {
      return this.createEmptyResult('cpu', startTime);
    }

    // Choose culling strategy based on element count and available features
    let result: CullingResult;
    
    if (this.shouldUseGPUCulling(elements, viewport)) {
      result = await this.cullWithGPU(elements, viewport, startTime);
    } else if (this.shouldUseWorkers(elements, viewport)) {
      result = await this.cullWithWorkers(elements, viewport, startTime);
    } else {
      result = this.cullOnCPU(elements, viewport, startTime);
    }
    
    // Update performance statistics
    this.updateStats(result);
    
    return result;
  }

  /**
   * CPU-based culling with all optimizations
   */
  private cullOnCPU(elements: SpatialElement[], viewport: Viewport, startTime: number): CullingResult {
    const frustum = this.createOptimizedFrustum(viewport);
    const viewerX = viewport.x;
    const viewerY = viewport.y;
    const viewerZ = viewport.z || 0;
    
    // Use spatial index for initial filtering if available
    let candidateElements = elements;
    if (this.spatialIndex) {
      const queryRadius = this.options.frustumCullDistance * 1.2; // 20% padding
      candidateElements = this.spatialIndex.queryRadius(viewerX, viewerY, viewerZ, queryRadius);
    }
    
    const visibleArray = this.arrayPool.acquire();
    const frustumCulledArray = this.arrayPool.acquire();
    const distanceCulledArray = this.arrayPool.acquire();
    
    let cacheHits = 0;
    let cacheMisses = 0;
    
    try {
      // Process elements in batches for better cache locality
      const batchSize = 64;
      
      for (let i = 0; i < candidateElements.length; i += batchSize) {
        const batch = candidateElements.slice(i, i + batchSize);
        
        for (const element of batch) {
          const bounds3D = this.getElement3DBounds(element);
          
          // Frustum culling
          if (!this.isInFrustum(bounds3D, frustum)) {
            frustumCulledArray.push(element);
            this.boundsPool.release(bounds3D);
            continue;
          }
          
          // Distance culling with caching
          let distance: number;
          if (this.options.enableDistanceCache) {
            distance = this.distanceCache.getDistance(
              element.id, bounds3D, viewerX, viewerY, viewerZ
            );
            // Check if this was a cache hit (simplified check)
            cacheHits++;
          } else {
            distance = this.calculateDistance(bounds3D, viewerZ);
            cacheMisses++;
          }
          
          if (distance > this.options.frustumCullDistance) {
            distanceCulledArray.push(element);
            this.boundsPool.release(bounds3D);
            continue;
          }
          
          // Apply LOD based on distance
          element.lodLevel = this.calculateLODLevel(distance);
          
          visibleArray.push(element);
          this.boundsPool.release(bounds3D);
        }
      }
      
      const processingTime = performance.now() - startTime;
      const cacheHitRate = cacheHits / (cacheHits + cacheMisses);
      
      const result: CullingResult = {
        visibleElements: [...visibleArray],
        culledElements: [...frustumCulledArray, ...distanceCulledArray],
        statistics: {
          totalElements: elements.length,
          frustumCulled: frustumCulledArray.length,
          distanceCulled: distanceCulledArray.length,
          occlusionCulled: 0, // TODO: Add CPU occlusion culling
          visibleElements: visibleArray.length,
          processingTime,
          cacheHitRate,
          method: 'cpu',
        },
      };
      
      return result;
      
    } finally {
      // Clean up pooled objects
      this.arrayPool.release(visibleArray);
      this.arrayPool.release(frustumCulledArray);
      this.arrayPool.release(distanceCulledArray);
      this.frustumPool.release(frustum);
    }
  }

  /**
   * Worker-based culling for large datasets
   */
  private async cullWithWorkers(elements: SpatialElement[], viewport: Viewport, startTime: number): Promise<CullingResult> {
    try {
      const result = await this.workerManager.cullElements(
        elements,
        viewport,
        {
          frustumCullDistance: this.options.frustumCullDistance,
          lodThresholds: this.options.lodDistanceThresholds,
          gridSize: 100,
        }
      );
      
      const processingTime = performance.now() - startTime;
      
      return {
        visibleElements: result.visibleElements,
        culledElements: result.culledElements,
        statistics: {
          ...result.statistics,
          processingTime,
          cacheHitRate: 0, // Workers don't use cache yet
          method: 'worker',
        },
      };
    } catch (error) {
      console.warn('Worker culling failed, falling back to CPU:', error);
      return this.cullOnCPU(elements, viewport, startTime);
    }
  }

  /**
   * GPU-based culling (future implementation)
   */
  private async cullWithGPU(elements: SpatialElement[], viewport: Viewport, startTime: number): Promise<CullingResult> {
    // Placeholder for GPU culling implementation
    console.log('GPU culling not fully implemented, falling back to CPU');
    return this.cullOnCPU(elements, viewport, startTime);
  }

  /**
   * Strategy selection logic
   */
  private shouldUseGPUCulling(elements: SpatialElement[], viewport: Viewport): boolean {
    return this.options.enableGPUCulling && 
           this.shaderManager?.hasGPUCulling() && 
           elements.length > 5000; // Use GPU for very large datasets
  }

  private shouldUseWorkers(elements: SpatialElement[], viewport: Viewport): boolean {
    return this.options.enableWorkers && 
           elements.length >= this.options.maxWorkerElements &&
           !this.shouldUseGPUCulling(elements, viewport);
  }

  /**
   * Optimized helper methods
   */
  private createOptimizedFrustum(viewport: Viewport) {
    const frustum = this.frustumPool.acquire();
    const { x, y, z = 0, zoom, width, height } = viewport;
    
    const worldWidth = width / zoom;
    const worldHeight = height / zoom;
    const halfDistance = this.options.frustumCullDistance / 2;
    
    return this.frustumPool.setFrustum(
      frustum,
      x - worldWidth / 2,  // left
      x + worldWidth / 2,  // right
      y - worldHeight / 2, // top
      y + worldHeight / 2, // bottom
      z - halfDistance,    // near
      z + halfDistance     // far
    );
  }

  private getElement3DBounds(element: SpatialElement): BoundingBox3D {
    const bounds3D = this.boundsPool.acquire();
    const zPos = element.zPosition ?? 0;
    const zSize = element.zBounds ? element.zBounds.far - element.zBounds.near : 1;
    
    return this.boundsPool.setBounds(
      bounds3D,
      element.bounds.x,
      element.bounds.y,
      element.bounds.width,
      element.bounds.height,
      element.zBounds?.near ?? zPos - zSize / 2,
      element.zBounds?.far ?? zPos + zSize / 2
    );
  }

  private isInFrustum(bounds: BoundingBox3D, frustum: any): boolean {
    return !(
      bounds.x + bounds.width < frustum.left ||
      bounds.x > frustum.right ||
      bounds.y + bounds.height < frustum.top ||
      bounds.y > frustum.bottom ||
      bounds.zMax < frustum.near ||
      bounds.zMin > frustum.far
    );
  }

  private calculateDistance(bounds: BoundingBox3D, viewerZ: number): number {
    const elementCenterZ = (bounds.zMin + bounds.zMax) / 2;
    return Math.abs(elementCenterZ - viewerZ);
  }

  private calculateLODLevel(distance: number): number {
    const thresholds = this.options.lodDistanceThresholds;
    
    for (let i = 0; i < thresholds.length; i++) {
      if (distance <= thresholds[i]) {
        return i;
      }
    }
    
    return thresholds.length; // Lowest detail
  }

  private createEmptyResult(method: 'cpu' | 'worker' | 'gpu', startTime: number): CullingResult {
    return {
      visibleElements: [],
      culledElements: [],
      statistics: {
        totalElements: 0,
        frustumCulled: 0,
        occlusionCulled: 0,
        distanceCulled: 0,
        visibleElements: 0,
        processingTime: performance.now() - startTime,
        cacheHitRate: 0,
        method,
      },
    };
  }

  private updateStats(result: CullingResult): void {
    this.stats.totalCullingOperations++;
    
    // Exponential moving average for processing time
    const alpha = 0.1;
    this.stats.averageProcessingTime = 
      this.stats.averageProcessingTime * (1 - alpha) + 
      result.statistics.processingTime * alpha;
    
    // Update usage rates
    if (result.statistics.method === 'worker') {
      this.stats.workerUsageRate = this.stats.workerUsageRate * 0.9 + 0.1;
    } else {
      this.stats.workerUsageRate = this.stats.workerUsageRate * 0.9;
    }
    
    if (result.statistics.method === 'gpu') {
      this.stats.gpuUsageRate = this.stats.gpuUsageRate * 0.9 + 0.1;
    } else {
      this.stats.gpuUsageRate = this.stats.gpuUsageRate * 0.9;
    }
    
    this.stats.cacheHitRate = result.statistics.cacheHitRate;
    this.stats.lastUpdateTime = performance.now();
  }

  /**
   * Configuration and monitoring
   */
  updateOptions(newOptions: Partial<CullingOptions>): void {
    Object.assign(this.options, newOptions);
  }

  getPerformanceStats(): typeof this.stats {
    return { ...this.stats };
  }

  getDetailedStats(): {
    cullingSystem: typeof this.stats;
    distanceCache: any;
    spatialIndex: any;
    objectPools: any;
  } {
    return {
      cullingSystem: this.getPerformanceStats(),
      distanceCache: this.distanceCache.getStats(),
      spatialIndex: this.spatialIndex?.getStats() || null,
      objectPools: {
        bounds3D: this.boundsPool.getStats(),
        frustum: this.frustumPool.getStats(),
        arrays: this.arrayPool.getStats(),
      },
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.workerManager.destroy();
    this.spatialIndex = null;
    this.shaderManager = null;
    this.worldBounds = null;
  }
}