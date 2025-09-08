import React, { createContext, useContext } from 'react';
import { useSpatialRouter } from '../hooks/useSpatialRouter.js';
import type { SpatialRoute, SpatialRouterState } from '../types.js';

const SpatialRouterContext = createContext<SpatialRouterState | null>(null);

export interface SpatialRouterProps {
  routes: SpatialRoute[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SpatialRouter: React.FC<SpatialRouterProps> = ({
  routes,
  children,
  fallback,
}) => {
  const routerState = useSpatialRouter(routes);

  return (
    <SpatialRouterContext.Provider value={routerState}>
      {children || fallback}
    </SpatialRouterContext.Provider>
  );
};

export const useSpatialRouterContext = (): SpatialRouterState => {
  const context = useContext(SpatialRouterContext);
  
  if (!context) {
    throw new Error('useSpatialRouterContext must be used within a SpatialRouter');
  }
  
  return context;
};