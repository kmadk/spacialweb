import { useState, useCallback, useEffect, useContext } from 'react';
import { SpatialContext } from '../context/SpatialContext.js';
import type { SpatialRoute, SpatialRouterState, TransitionOptions } from '../types.js';

export const useSpatialRouter = (routes: SpatialRoute[]): SpatialRouterState => {
  const spatialEngine = useContext(SpatialContext);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);

  if (!spatialEngine) {
    throw new Error('useSpatialRouter must be used within a SpatialApp');
  }

  const navigateToRoute = useCallback(
    async (routeId: string, options?: TransitionOptions): Promise<void> => {
      const route = routes.find(r => r.id === routeId);
      if (!route) {
        throw new Error(`Route with id "${routeId}" not found`);
      }

      await spatialEngine.flyTo(route.bounds, options);
      setCurrentRoute(routeId);

      // Update browser URL if we're in a browser environment
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({ routeId }, '', route.path);
      }
    },
    [routes, spatialEngine]
  );

  // Listen for browser navigation events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent): void => {
      const routeId = event.state?.routeId;
      if (routeId && routes.find(r => r.id === routeId)) {
        navigateToRoute(routeId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigateToRoute, routes]);

  // Set initial route based on current URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;
    const matchingRoute = routes.find(route => route.path === currentPath);
    
    if (matchingRoute && !currentRoute) {
      setCurrentRoute(matchingRoute.id);
    }
  }, [routes, currentRoute]);

  return {
    currentRoute,
    routes,
    navigateToRoute,
  };
};