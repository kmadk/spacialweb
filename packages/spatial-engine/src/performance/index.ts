/**
 * Performance optimization utilities
 * Tree-shakeable exports for advanced performance tuning
 */

export { ViewportCuller, type CullingStats } from './viewport-culling.js';
export { ObjectPool, PooledViewport, PooledBoundingBox, viewportPool, boundingBoxPool } from './object-pool.js';
export { RenderScheduler, type RenderTask, type FrameBudget } from './render-scheduler.js';
export { MemoryProfiler, type MemorySnapshot, type LeakDetectionResult } from './memory-profiler.js';