import React, { useRef, useEffect, useState } from 'react';
import { SpatialEngine } from '@fir/spatial-engine';
import { SpatialProvider } from '../context/SpatialContext.js';
import type { SpatialWorld, SpatialEngineOptions } from '../types.js';

export interface SpatialAppProps {
  world: SpatialWorld;
  children: React.ReactNode;
  options?: SpatialEngineOptions;
  className?: string;
  style?: React.CSSProperties;
  onEngineReady?: (engine: SpatialEngine) => void;
  onError?: (error: Error) => void;
}

export const SpatialApp: React.FC<SpatialAppProps> = ({
  world,
  children,
  options = {},
  className,
  style,
  onEngineReady,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [spatialEngine, setSpatialEngine] = useState<SpatialEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const initializeEngine = async (): Promise<void> => {
      try {
        const engine = new SpatialEngine(container, options);
        engine.loadWorld(world);

        setSpatialEngine(engine);
        setIsReady(true);
        setError(null);

        onEngineReady?.(engine);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize spatial engine');
        setError(error);
        onError?.(error);
      }
    };

    initializeEngine();

    return () => {
      if (spatialEngine) {
        spatialEngine.destroy();
      }
    };
  }, [world, options, onEngineReady, onError, spatialEngine]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current || !spatialEngine) return;

    const container = containerRef.current;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Update viewport dimensions
        const viewport = spatialEngine.getViewport();
        spatialEngine.setViewport?.({
          ...viewport,
          width,
          height,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [spatialEngine]);

  if (error) {
    return (
      <div
        className={`spatial-app spatial-app--error ${className || ''}`}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#d32f2f',
          fontFamily: 'system-ui, sans-serif',
          ...style,
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Spatial Engine Error</h2>
          <p>{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div
        className={`spatial-app spatial-app--loading ${className || ''}`}
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          fontFamily: 'system-ui, sans-serif',
          ...style,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e0e0e0',
              borderTop: '4px solid #1976d2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ margin: 0, color: '#666' }}>Loading spatial world...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        ref={containerRef}
        className={`spatial-app ${className || ''}`}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
      >
        {isReady && spatialEngine && (
          <SpatialProvider spatialEngine={spatialEngine}>
            <div
              className="spatial-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <div style={{ pointerEvents: 'auto' }}>{children}</div>
            </div>
          </SpatialProvider>
        )}
      </div>
    </>
  );
};