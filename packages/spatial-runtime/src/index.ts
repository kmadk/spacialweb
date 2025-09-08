// Components
export { SpatialApp } from './components/SpatialApp.js';
export { SpatialRouter, useSpatialRouterContext } from './components/SpatialRouter.js';
export { SpatialRegion } from './components/SpatialRegion.js';
export { NavigationControls } from './components/NavigationControls.js';

// Hooks
export { useSpatialNavigation } from './hooks/useSpatialNavigation.js';
export { useSpatialRouter } from './hooks/useSpatialRouter.js';

// Context
export { SpatialProvider, SpatialContext } from './context/SpatialContext.js';

// Core
export { SpatialEngine } from '@fir/spatial-engine';

// Types
export type {
  Viewport,
  SpatialElement,
  SpatialWorld,
  TransitionOptions,
  SpatialEngineOptions,
  SpatialRoute,
  SpatialRegionProps,
  SpatialNavigation,
  SpatialRouterState,
} from './types.js';