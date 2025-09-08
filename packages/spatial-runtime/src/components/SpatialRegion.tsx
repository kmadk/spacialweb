import React, { useEffect } from 'react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation.js';
import type { SpatialRegionProps } from '../types.js';

export const SpatialRegion: React.FC<SpatialRegionProps> = ({
  id,
  bounds,
  elements,
  children,
  className,
  style,
}) => {
  const { flyTo } = useSpatialNavigation();

  // Register this region for navigation
  useEffect(() => {
    // The region is automatically available for navigation via flyTo(id)
    // since the spatial engine indexes elements by ID
  }, [id]);

  const handleRegionClick = (event: React.MouseEvent): void => {
    // Only handle clicks on the region itself, not its children
    if (event.target === event.currentTarget) {
      flyTo(id);
    }
  };

  const regionStyle: React.CSSProperties = {
    position: 'absolute',
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    pointerEvents: 'auto',
    cursor: 'pointer',
    ...style,
  };

  return (
    <div
      id={id}
      className={`spatial-region ${className || ''}`}
      style={regionStyle}
      onClick={handleRegionClick}
      data-spatial-region="true"
      data-bounds={JSON.stringify(bounds)}
      data-element-count={elements.length}
    >
      {children}
    </div>
  );
};