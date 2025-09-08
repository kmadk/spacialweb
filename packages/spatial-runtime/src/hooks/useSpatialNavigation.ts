import { useContext, useCallback } from 'react';
import { SpatialContext } from '../context/SpatialContext.js';
import type { SpatialNavigation, Viewport, TransitionOptions } from '../types.js';

export const useSpatialNavigation = (): SpatialNavigation => {
  const spatialEngine = useContext(SpatialContext);

  if (!spatialEngine) {
    throw new Error('useSpatialNavigation must be used within a SpatialApp');
  }

  const flyTo = useCallback(
    async (target: string, options?: TransitionOptions): Promise<void> => {
      await spatialEngine.flyTo(target, options);
    },
    [spatialEngine]
  );

  const getCurrentViewport = useCallback((): Viewport => {
    return spatialEngine.getViewport();
  }, [spatialEngine]);

  const zoomToFit = useCallback(
    async (elementIds: string[], options?: TransitionOptions): Promise<void> => {
      const elements = elementIds
        .map(id => spatialEngine.findElementById(id))
        .filter(Boolean);
      
      if (elements.length === 0) return;

      // Calculate bounding box for all elements
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const element of elements) {
        minX = Math.min(minX, element!.bounds.x);
        minY = Math.min(minY, element!.bounds.y);
        maxX = Math.max(maxX, element!.bounds.x + element!.bounds.width);
        maxY = Math.max(maxY, element!.bounds.y + element!.bounds.height);
      }

      const bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };

      await spatialEngine.flyTo(bounds, options);
    },
    [spatialEngine]
  );

  const panTo = useCallback(
    async (x: number, y: number, options?: TransitionOptions): Promise<void> => {
      const currentViewport = spatialEngine.getViewport();
      await spatialEngine.flyTo(
        {
          ...currentViewport,
          x,
          y,
        },
        options
      );
    },
    [spatialEngine]
  );

  const setZoom = useCallback(
    async (zoom: number, options?: TransitionOptions): Promise<void> => {
      const currentViewport = spatialEngine.getViewport();
      await spatialEngine.flyTo(
        {
          ...currentViewport,
          zoom,
        },
        options
      );
    },
    [spatialEngine]
  );

  return {
    flyTo,
    getCurrentViewport,
    zoomToFit,
    panTo,
    setZoom,
  };
};