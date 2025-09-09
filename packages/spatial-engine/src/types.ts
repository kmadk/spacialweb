// import type { Layer } from '@deck.gl/core';
import type { BoundingBox as PenpotBoundingBox } from '@fir/penpot-parser';

export type BoundingBox = PenpotBoundingBox;

export interface Viewport {
  x: number;
  y: number;
  z?: number; // Optional z-coordinate for 3D navigation
  zoom: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface SpatialElement {
  id: string;
  type: string;
  position: Point;
  bounds: BoundingBox;
  zPosition?: number; // Z-coordinate for 3D layering
  zBounds?: { near: number; far: number }; // 3D depth bounds
  data?: any;
  children?: SpatialElement[];
  lodLevel?: number;
  renderPriority?: number;
  styles?: any; // Element styles
  layer?: number; // Layer index
}

export interface SpatialWorld {
  bounds: BoundingBox;
  elements: SpatialElement[];
  regions: SpatialRegion[];
  connections: SpatialConnection[];
}

export interface SpatialRegion {
  id: string;
  name: string;
  bounds: BoundingBox;
  elements: SpatialElement[];
  zoomRange: { min: number; max: number };
}

export interface SpatialConnection {
  id: string;
  from: string;
  to: string;
  type: 'navigation' | 'data-flow' | 'parent-child';
}

export interface TransitionOptions {
  duration?: number;
  easing?: EasingFunction;
  type?: 'fly' | 'zoom' | 'pan' | 'dive' | 'emerge';
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

export interface LODLevel {
  geometry: 'simplified' | 'medium' | 'full';
  labels: boolean;
  metadata: boolean;
  interactions: boolean;
  children: boolean;
}

export interface PerformanceMetrics {
  rendering: {
    frameTime: number;
    frameRate: number;
    droppedFrames: number;
    renderTime: number;
    culledElements: number;
  };
  memory: {
    jsHeapSize: number;
    totalHeapSize: number;
    elementCount: number;
    assetMemory: number;
  };
  interactions: {
    transitionTime: number;
    responseTime: number;
    clickAccuracy: number;
  };
  scheduler?: any;
}

export interface SpatialEngineOptions {
  initialViewport?: Partial<Viewport>;
  maxZoom?: number;
  minZoom?: number;
  maxDepth?: number;
  minDepth?: number;
  enable3D?: boolean;
  enableLOD?: boolean;
  enableCulling?: boolean;
  performanceMode?: 'high-quality' | 'balanced' | 'performance';
  deckGLOptions?: any;
}

export type EasingFunction =
  | 'linear'
  | 'easeInOutCubic'
  | 'easeOutQuart'
  | 'easeOutExpo'
  | 'easeInOutBack'
  | 'easeInOutElastic'  // Good for z-axis depth transitions
  | 'easeOutBounce';    // Engaging for layer emergence

export interface EventMap {
  viewportChange: { viewport: Viewport };
  elementClick: SpatialElement;
  elementHover: SpatialElement;
  customAction: { action: any; element: SpatialElement };
  performanceUpdate: PerformanceMetrics;
  zNavigationStart: { fromZ: number; toZ: number };
  zNavigationEnd: { z: number };
}

// Z-axis navigation specific interfaces
export interface ZNavigationOptions {
  targetZ?: number;
  relativeDelta?: number;
  transitionDuration?: number;
  easing?: EasingFunction;
  onProgress?: (progress: number, currentZ: number) => void;
  onComplete?: (finalZ: number) => void;
}

export interface SpatialLayer {
  id: string;
  name?: string;
  zIndex: number;
  elements: SpatialElement[];
  visible: boolean;
  opacity?: number;
  cullDistance?: number; // Distance at which layer becomes invisible
}

// Plugin system interfaces
export interface SpatialPlugin {
  id: string;
  name: string;
  version: string;
  initialize(engine: any): void;
  destroy(): void;
  onViewportChange?(viewport: Viewport): void;
  onElementInteraction?(element: SpatialElement, type: string): void;
}

export interface SpatialBehavior {
  id: string;
  name: string;
  apply(elements: SpatialElement[], context: any): SpatialElement[];
  shouldApply(context: any): boolean;
}

export interface EventMap {
  viewportChange: { viewport: Viewport };
  worldLoaded: { world: SpatialWorld };
  flowsChoreographed: { flows: any[]; connections: any[] };
}