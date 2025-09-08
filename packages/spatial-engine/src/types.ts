import type { Layer } from '@deck.gl/core';
import type { BoundingBox } from '@fir/penpot-parser';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SpatialElement {
  id: string;
  type: string;
  position: Point;
  bounds: BoundingBox;
  data?: any;
  children?: SpatialElement[];
  lodLevel?: number;
  renderPriority?: number;
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
  type?: 'fly' | 'zoom' | 'pan';
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
}

export interface SpatialEngineOptions {
  initialViewport?: Partial<Viewport>;
  maxZoom?: number;
  minZoom?: number;
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
  | 'easeInOutBack';

export interface EventMap {
  viewportChange: Viewport;
  elementClick: SpatialElement;
  elementHover: SpatialElement;
  customAction: { action: any; element: SpatialElement };
  performanceUpdate: PerformanceMetrics;
}