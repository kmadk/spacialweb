import type {
  Viewport,
  SpatialElement,
  SpatialWorld,
  TransitionOptions,
  SpatialEngineOptions,
} from '@fir/spatial-engine';

export type { Viewport, SpatialElement, SpatialWorld, TransitionOptions, SpatialEngineOptions };

export interface SpatialRoute {
  id: string;
  path: string;
  component: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SpatialRegionProps {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  elements: SpatialElement[];
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface SpatialNavigation {
  flyTo: (target: string, options?: TransitionOptions) => Promise<void>;
  getCurrentViewport: () => Viewport;
  zoomToFit: (elementIds: string[], options?: TransitionOptions) => Promise<void>;
  panTo: (x: number, y: number, options?: TransitionOptions) => Promise<void>;
  setZoom: (zoom: number, options?: TransitionOptions) => Promise<void>;
}

export interface SpatialRouterState {
  currentRoute: string | null;
  routes: SpatialRoute[];
  navigateToRoute: (routeId: string, options?: TransitionOptions) => Promise<void>;
}