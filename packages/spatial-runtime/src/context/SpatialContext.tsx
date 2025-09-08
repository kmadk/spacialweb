import React, { createContext } from 'react';
import type { SpatialEngine } from '@fir/spatial-engine';

export const SpatialContext = createContext<SpatialEngine | null>(null);

export interface SpatialProviderProps {
  spatialEngine: SpatialEngine;
  children: React.ReactNode;
}

export const SpatialProvider: React.FC<SpatialProviderProps> = ({
  spatialEngine,
  children,
}) => {
  return (
    <SpatialContext.Provider value={spatialEngine}>
      {children}
    </SpatialContext.Provider>
  );
};