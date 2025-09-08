import React, { useState, useEffect } from 'react';
import { useSpatialNavigation } from '../hooks/useSpatialNavigation.js';
import type { Viewport } from '../types.js';

export interface NavigationControlsProps {
  className?: string;
  style?: React.CSSProperties;
  showZoomLevel?: boolean;
  showCoordinates?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  className,
  style,
  showZoomLevel = true,
  showCoordinates = false,
  position = 'top-right',
}) => {
  const { getCurrentViewport, setZoom, panTo } = useSpatialNavigation();
  const [viewport, setViewport] = useState<Viewport>(getCurrentViewport());

  useEffect(() => {
    const updateViewport = (): void => {
      setViewport(getCurrentViewport());
    };

    const interval = setInterval(updateViewport, 100);
    return () => clearInterval(interval);
  }, [getCurrentViewport]);

  const handleZoomIn = (): void => {
    setZoom(viewport.zoom * 1.5, { duration: 300 });
  };

  const handleZoomOut = (): void => {
    setZoom(viewport.zoom / 1.5, { duration: 300 });
  };

  const handleReset = (): void => {
    setZoom(1, { duration: 500 });
    panTo(0, 0, { duration: 500 });
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
  };

  const controlsStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    backdropFilter: 'blur(4px)',
    ...positionStyles[position],
    ...style,
  };

  const buttonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s',
  };

  return (
    <div className={`spatial-controls ${className || ''}`} style={controlsStyle}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          style={buttonStyle}
          onClick={handleZoomIn}
          title="Zoom In"
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          +
        </button>
        <button
          style={buttonStyle}
          onClick={handleZoomOut}
          title="Zoom Out"
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          −
        </button>
        <button
          style={buttonStyle}
          onClick={handleReset}
          title="Reset View"
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          ⌂
        </button>
      </div>

      {showZoomLevel && (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
          {viewport.zoom < 0.01
            ? `${(viewport.zoom * 1000).toFixed(1)}‰`
            : viewport.zoom < 1
            ? `${(viewport.zoom * 100).toFixed(0)}%`
            : `${viewport.zoom.toFixed(1)}x`}
        </div>
      )}

      {showCoordinates && (
        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
          ({viewport.x.toFixed(0)}, {viewport.y.toFixed(0)})
        </div>
      )}
    </div>
  );
};