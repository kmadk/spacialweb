/**
 * FIR Spatial Engine - High-performance spatial navigation with infinite zoom
 * 
 * Core exports for production use
 */

// Main engine classes
export { SpatialEngine } from './spatial-engine.js';
export { LODManager } from './lod-manager.js';
export { TransitionManager } from './transition-manager.js';

// Core types
export type {
  Viewport,
  Point,
  SpatialElement,
  SpatialWorld,
  SpatialRegion,
  SpatialConnection,
  TransitionOptions,
  LODLevel,
  PerformanceMetrics,
  SpatialEngineOptions,
  EasingFunction,
  EventMap,
  BoundingBox,
} from './types.js';

// Essential performance utilities (tree-shakeable)
export { ViewportCuller } from './performance/viewport-culling.js';
export { ObjectPool, PooledViewport, PooledBoundingBox } from './performance/object-pool.js';
export { RenderScheduler } from './performance/render-scheduler.js';

// Optimized spatial engine - main feature
export { OptimizedSpatialEngine } from './optimized-spatial-engine.js';

// Penpot flow parsing - core integration
export {
  PenpotFlowParser,
  type PenpotFlow,
  type PenpotConnection,
  type FlowExtractionResult,
} from './cinematics/penpot-flow-parser.js';

// Optional: Cinematic enhancements for storytelling and presentations
export {
  FlowChoreographer,
  CinematicEasingLibrary,
  SpatialAudioEngine,
  CinematicDemo,
  type CinematicMovement,
  type CinematicSequence,
  type CinematicKeyframe,
  type CinematicEasing,
  type EasingFunction,
  type SpatialAudioOptions,
  type AudioCue,
  type SpatialAudioState,
  type CinematicDemoOptions,
  type DemoScenario,
} from './cinematics/index.js';