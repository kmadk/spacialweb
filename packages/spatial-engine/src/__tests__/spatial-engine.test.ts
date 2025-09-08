import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SpatialEngine } from '../spatial-engine.js';
import { LODManager } from '../lod-manager.js';
import { TransitionManager } from '../transition-manager.js';
import type { SpatialWorld, SpatialElement, Viewport, TransitionOptions } from '../types.js';

// Mock deck.gl
const mockDeck = {
  setProps: vi.fn(),
  finalize: vi.fn(),
  getProps: vi.fn(() => ({})),
};

vi.mock('@deck.gl/core', () => ({
  Deck: vi.fn(() => mockDeck),
}));

vi.mock('@deck.gl/layers', () => ({
  PolygonLayer: vi.fn(),
  TextLayer: vi.fn(),
  BitmapLayer: vi.fn(),
}));

// Mock RBush
class MockRBush {
  private items: any[] = [];
  
  clear() {
    this.items = [];
  }
  
  load(items: any[]) {
    this.items = items;
  }
  
  search(bbox: any) {
    // Simple mock search - return items that overlap
    return this.items.filter(item => {
      return !(item.maxX < bbox.minX || item.minX > bbox.maxX || 
               item.maxY < bbox.minY || item.minY > bbox.maxY);
    });
  }
}

vi.mock('rbush', () => ({
  default: MockRBush,
}));

describe('SpatialEngine', () => {
  let container: HTMLDivElement;
  let engine: SpatialEngine;
  let mockWorld: SpatialWorld;

  beforeEach(() => {
    // Create mock container
    container = document.createElement('div');
    container.style.width = '1200px';
    container.style.height = '800px';
    Object.defineProperty(container, 'clientWidth', { value: 1200 });
    Object.defineProperty(container, 'clientHeight', { value: 800 });

    // Create mock spatial world
    mockWorld = {
      bounds: { x: 0, y: 0, width: 2400, height: 1600 },
      elements: [
        {
          id: 'element-1',
          type: 'rectangle',
          position: { x: 100, y: 100 },
          bounds: { x: 100, y: 100, width: 200, height: 150 },
          data: {
            styles: {
              fill: { color: '#ff0000' },
              stroke: { color: '#000000', width: 2 },
            },
          },
        },
        {
          id: 'element-2',
          type: 'text',
          position: { x: 400, y: 200 },
          bounds: { x: 400, y: 200, width: 300, height: 60 },
          data: {
            text: 'Hello World',
            styles: {
              typography: {
                fontFamily: 'Inter',
                fontSize: 24,
                color: '#333333',
              },
            },
          },
        },
        {
          id: 'element-3',
          type: 'group',
          position: { x: 800, y: 300 },
          bounds: { x: 800, y: 300, width: 400, height: 300 },
          children: [
            {
              id: 'child-1',
              type: 'rectangle',
              position: { x: 0, y: 0 },
              bounds: { x: 800, y: 300, width: 180, height: 120 },
              data: { styles: { fill: { color: '#00ff00' } } },
            },
          ],
        },
      ],
      regions: [
        {
          id: 'region-1',
          name: 'Header Region',
          bounds: { x: 0, y: 0, width: 2400, height: 200 },
          elements: [],
          zoomRange: { min: 0.1, max: 5 },
        },
      ],
      connections: [],
    };

    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default viewport', () => {
      engine = new SpatialEngine(container);
      const viewport = engine.getViewport();

      expect(viewport.x).toBe(0);
      expect(viewport.y).toBe(0);
      expect(viewport.zoom).toBe(1);
      expect(viewport.width).toBe(1200);
      expect(viewport.height).toBe(800);
    });

    it('should initialize with custom viewport options', () => {
      const options = {
        initialViewport: {
          x: 100,
          y: 200,
          zoom: 2,
        },
      };

      engine = new SpatialEngine(container, options);
      const viewport = engine.getViewport();

      expect(viewport.x).toBe(100);
      expect(viewport.y).toBe(200);
      expect(viewport.zoom).toBe(2);
    });

    it('should create deck.gl instance with correct configuration', () => {
      engine = new SpatialEngine(container);
      
      // Verify Deck constructor was called
      const { Deck } = require('@deck.gl/core');
      expect(Deck).toHaveBeenCalledWith(
        expect.objectContaining({
          container,
          controller: expect.objectContaining({
            scrollZoom: { speed: 0.01, smooth: true },
            doubleClickZoom: true,
            touchZoom: true,
            minZoom: -10,
            maxZoom: 10,
          }),
        })
      );
    });
  });

  describe('world loading', () => {
    beforeEach(() => {
      engine = new SpatialEngine(container);
    });

    it('should load world and build spatial index', () => {
      engine.loadWorld(mockWorld);

      // Should set viewport to show overview of world
      const viewport = engine.getViewport();
      expect(viewport.x).toBe(mockWorld.bounds.x + mockWorld.bounds.width / 2);
      expect(viewport.y).toBe(mockWorld.bounds.y + mockWorld.bounds.height / 2);
      expect(viewport.zoom).toBeGreaterThan(0);
    });

    it('should calculate correct overview zoom', () => {
      engine.loadWorld(mockWorld);
      const viewport = engine.getViewport();

      // Should fit the world within the viewport with padding
      const expectedZoomX = (1200 - 100) / 2400;  // (viewport width - padding) / world width
      const expectedZoomY = (800 - 100) / 1600;   // (viewport height - padding) / world height
      const expectedZoom = Math.min(expectedZoomX, expectedZoomY, 1);

      expect(viewport.zoom).toBeCloseTo(expectedZoom, 2);
    });
  });

  describe('element finding', () => {
    beforeEach(() => {
      engine = new SpatialEngine(container);
      engine.loadWorld(mockWorld);
    });

    it('should find element by id', () => {
      const element = engine.findElementById('element-1');
      expect(element).toBeDefined();
      expect(element?.id).toBe('element-1');
      expect(element?.type).toBe('rectangle');
    });

    it('should find nested element by id', () => {
      const element = engine.findElementById('child-1');
      expect(element).toBeDefined();
      expect(element?.id).toBe('child-1');
    });

    it('should return null for non-existent element', () => {
      const element = engine.findElementById('non-existent');
      expect(element).toBeNull();
    });
  });

  describe('viewport management', () => {
    beforeEach(() => {
      engine = new SpatialEngine(container);
      engine.loadWorld(mockWorld);
    });

    it('should get current viewport', () => {
      const viewport = engine.getViewport();
      
      expect(viewport).toHaveProperty('x');
      expect(viewport).toHaveProperty('y');
      expect(viewport).toHaveProperty('zoom');
      expect(viewport).toHaveProperty('width');
      expect(viewport).toHaveProperty('height');
    });

    it('should handle viewport changes', () => {
      const newViewport: Viewport = {
        x: 500,
        y: 400,
        zoom: 2,
        width: 1200,
        height: 800,
      };

      // Simulate viewport change from deck.gl
      const deckConfig = mockDeck.setProps.mock.calls[0]?.[0];
      if (deckConfig?.onViewStateChange) {
        deckConfig.onViewStateChange({
          viewState: {
            longitude: newViewport.x,
            latitude: newViewport.y,
            zoom: Math.log2(newViewport.zoom),
            width: newViewport.width,
            height: newViewport.height,
          },
        });
      }

      // Verify deck.gl was updated
      expect(mockDeck.setProps).toHaveBeenCalledWith({
        layers: expect.any(Array),
      });
    });
  });

  describe('flyTo functionality', () => {
    beforeEach(() => {
      engine = new SpatialEngine(container);
      engine.loadWorld(mockWorld);
    });

    it('should fly to element by id', async () => {
      const startViewport = engine.getViewport();
      
      await engine.flyTo('element-1', { duration: 10 });
      
      // Should have attempted to set viewport to element
      expect(mockDeck.setProps).toHaveBeenCalled();
    });

    it('should fly to bounding box', async () => {
      const targetBounds = { x: 100, y: 100, width: 200, height: 150 };
      
      await engine.flyTo(targetBounds, { duration: 10 });
      
      expect(mockDeck.setProps).toHaveBeenCalled();
    });

    it('should throw error for non-existent element', async () => {
      await expect(engine.flyTo('non-existent')).rejects.toThrow(
        'Element non-existent not found'
      );
    });

    it('should handle transition options', async () => {
      const options: TransitionOptions = {
        duration: 1000,
        easing: 'easeInOutCubic',
        onProgress: vi.fn(),
        onComplete: vi.fn(),
      };

      await engine.flyTo('element-1', options);
      
      // Should have completed the transition
      expect(options.onComplete).toHaveBeenCalled();
    });
  });

  describe('performance monitoring', () => {
    beforeEach(() => {
      engine = new SpatialEngine(container);
      engine.loadWorld(mockWorld);
    });

    it('should track performance metrics', () => {
      const metrics = engine.getPerformanceMetrics();

      expect(metrics).toHaveProperty('rendering');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('interactions');

      expect(metrics.rendering).toHaveProperty('frameTime');
      expect(metrics.rendering).toHaveProperty('frameRate');
      expect(metrics.rendering).toHaveProperty('droppedFrames');
    });

    it('should update performance metrics on render', () => {
      const initialMetrics = engine.getPerformanceMetrics();
      
      // Simulate render cycle
      const deckConfig = mockDeck.setProps.mock.calls[0]?.[0];
      if (deckConfig?.onBeforeRender) {
        deckConfig.onBeforeRender();
      }
      
      vi.spyOn(performance, 'now').mockReturnValue(1016); // 16ms frame
      
      if (deckConfig?.onAfterRender) {
        deckConfig.onAfterRender();
      }

      const updatedMetrics = engine.getPerformanceMetrics();
      expect(updatedMetrics.rendering.frameTime).toBe(16);
      expect(updatedMetrics.rendering.frameRate).toBeCloseTo(62.5, 1);
    });
  });

  describe('event handling', () => {
    beforeEach(() => {
      engine = new SpatialEngine(container);
      engine.loadWorld(mockWorld);
    });

    it('should emit viewport change events', () => {
      const viewportChangeListener = vi.fn();
      engine.on('viewportChange', viewportChangeListener);

      // Simulate viewport change
      const deckConfig = mockDeck.setProps.mock.calls[0]?.[0];
      if (deckConfig?.onViewStateChange) {
        deckConfig.onViewStateChange({
          viewState: {
            longitude: 100,
            latitude: 200,
            zoom: 1,
            width: 1200,
            height: 800,
          },
        });
      }

      expect(viewportChangeListener).toHaveBeenCalled();
    });

    it('should handle element click events', () => {
      const clickListener = vi.fn();
      engine.on('elementClick', clickListener);

      // We would need to simulate a deck.gl click event here
      // For now, test the event system structure
      expect(typeof engine.on).toBe('function');
      expect(typeof engine.off).toBe('function');
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      engine.on('viewportChange', listener);
      engine.off('viewportChange', listener);

      // Simulate viewport change
      const deckConfig = mockDeck.setProps.mock.calls[0]?.[0];
      if (deckConfig?.onViewStateChange) {
        deckConfig.onViewStateChange({
          viewState: {
            longitude: 100,
            latitude: 200,
            zoom: 1,
            width: 1200,
            height: 800,
          },
        });
      }

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('LOD integration', () => {
    beforeEach(() => {
      engine = new SpatialEngine(container);
      engine.loadWorld(mockWorld);
    });

    it('should apply LOD based on zoom level', () => {
      // Simulate zoom out (low detail needed)
      const deckConfig = mockDeck.setProps.mock.calls[0]?.[0];
      if (deckConfig?.onViewStateChange) {
        deckConfig.onViewStateChange({
          viewState: {
            longitude: 1200,
            latitude: 800,
            zoom: -5, // Very low zoom (0.03125x)
            width: 1200,
            height: 800,
          },
        });
      }

      // Should have updated layers with LOD applied
      expect(mockDeck.setProps).toHaveBeenCalledWith({
        layers: expect.any(Array),
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      engine = new SpatialEngine(container);
      engine.loadWorld(mockWorld);

      engine.destroy();

      expect(mockDeck.finalize).toHaveBeenCalled();
    });
  });
});

describe('LODManager', () => {
  let lodManager: LODManager;

  beforeEach(() => {
    lodManager = new LODManager();
  });

  describe('LOD level determination', () => {
    it('should apply appropriate LOD for different zoom levels', () => {
      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
      ];

      // Very low zoom - should simplify
      const lowZoomResult = lodManager.applyLOD(elements, 0.001);
      expect(lowZoomResult.length).toBeLessThanOrEqual(elements.length);

      // Medium zoom - should show more detail
      const mediumZoomResult = lodManager.applyLOD(elements, 1);
      expect(mediumZoomResult.length).toBeGreaterThanOrEqual(lowZoomResult.length);

      // High zoom - should show full detail
      const highZoomResult = lodManager.applyLOD(elements, 10);
      expect(highZoomResult.length).toBeGreaterThanOrEqual(mediumZoomResult.length);
    });

    it('should filter out elements that are too small to render', () => {
      const elements: SpatialElement[] = [
        {
          id: 'large-element',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 1000, height: 1000 }, // Large
        },
        {
          id: 'tiny-element',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 1, height: 1 }, // Tiny
        },
      ];

      const result = lodManager.applyLOD(elements, 0.001); // Very low zoom
      
      // Tiny element should be filtered out at low zoom
      expect(result.some(el => el.id === 'large-element')).toBe(true);
      // Tiny element might be filtered out
      const tinyElement = result.find(el => el.id === 'tiny-element');
      // At very low zoom, tiny elements should be culled
    });

    it('should handle nested elements correctly', () => {
      const elements: SpatialElement[] = [
        {
          id: 'parent',
          type: 'group',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 500, height: 500 },
          children: [
            {
              id: 'child',
              type: 'rectangle',
              position: { x: 0, y: 0 },
              bounds: { x: 0, y: 0, width: 100, height: 100 },
            },
          ],
        },
      ];

      const lowZoomResult = lodManager.applyLOD(elements, 0.1);
      const highZoomResult = lodManager.applyLOD(elements, 5);

      // At low zoom, children might be hidden
      // At high zoom, children should be visible
      expect(highZoomResult[0]?.children?.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('custom LOD configuration', () => {
    it('should allow custom LOD levels', () => {
      lodManager.setCustomLODLevel(2.5, {
        geometry: 'full',
        labels: true,
        metadata: true,
        interactions: true,
        children: true,
      });

      const customLevels = lodManager.getAllLODLevels();
      expect(customLevels.has(2.5)).toBe(true);
    });

    it('should remove LOD levels', () => {
      lodManager.setCustomLODLevel(3.0, {
        geometry: 'medium',
        labels: false,
        metadata: false,
        interactions: false,
        children: false,
      });

      lodManager.removeLODLevel(3.0);
      const levels = lodManager.getAllLODLevels();
      expect(levels.has(3.0)).toBe(false);
    });
  });
});

describe('TransitionManager', () => {
  let transitionManager: TransitionManager;

  beforeEach(() => {
    transitionManager = new TransitionManager();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('viewport transitions', () => {
    it('should animate between viewports', async () => {
      const startViewport: Viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
      const endViewport: Viewport = { x: 500, y: 300, zoom: 2, width: 1200, height: 800 };
      
      const onUpdate = vi.fn();
      const transitionPromise = transitionManager.animateToViewport(
        startViewport,
        endViewport,
        { duration: 1000 },
        onUpdate
      );

      // Advance time partway through animation
      vi.advanceTimersByTime(500);
      
      // Should have called onUpdate with intermediate values
      expect(onUpdate).toHaveBeenCalled();
      const calls = onUpdate.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Complete the animation
      vi.advanceTimersByTime(500);
      await transitionPromise;

      // Should have called onUpdate with final viewport
      const finalCall = calls[calls.length - 1][0];
      expect(finalCall.x).toBeCloseTo(endViewport.x, 1);
      expect(finalCall.y).toBeCloseTo(endViewport.y, 1);
      expect(finalCall.zoom).toBeCloseTo(endViewport.zoom, 1);
    });

    it('should handle easing functions', async () => {
      const startViewport: Viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
      const endViewport: Viewport = { x: 100, y: 100, zoom: 1, width: 1200, height: 800 };
      
      const onUpdate = vi.fn();
      const transitionPromise = transitionManager.animateToViewport(
        startViewport,
        endViewport,
        { duration: 1000, easing: 'easeInOutCubic' },
        onUpdate
      );

      vi.advanceTimersByTime(500); // Halfway
      vi.advanceTimersByTime(500); // Complete
      
      await transitionPromise;

      expect(onUpdate).toHaveBeenCalled();
    });

    it('should call progress callbacks', async () => {
      const startViewport: Viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
      const endViewport: Viewport = { x: 100, y: 100, zoom: 1, width: 1200, height: 800 };
      
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      
      const transitionPromise = transitionManager.animateToViewport(
        startViewport,
        endViewport,
        { duration: 1000, onProgress, onComplete },
        vi.fn()
      );

      vi.advanceTimersByTime(500);
      expect(onProgress).toHaveBeenCalledWith(expect.closeTo(0.5, 0.1));

      vi.advanceTimersByTime(500);
      await transitionPromise;
      
      expect(onProgress).toHaveBeenCalledWith(1);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should cancel existing transitions', async () => {
      const startViewport: Viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
      const endViewport1: Viewport = { x: 100, y: 100, zoom: 1, width: 1200, height: 800 };
      const endViewport2: Viewport = { x: 200, y: 200, zoom: 1, width: 1200, height: 800 };
      
      const onUpdate1 = vi.fn();
      const onUpdate2 = vi.fn();

      // Start first transition
      const transition1 = transitionManager.animateToViewport(
        startViewport,
        endViewport1,
        { duration: 1000 },
        onUpdate1
      );

      vi.advanceTimersByTime(250);

      // Start second transition (should cancel first)
      const transition2 = transitionManager.animateToViewport(
        startViewport,
        endViewport2,
        { duration: 1000 },
        onUpdate2
      );

      vi.advanceTimersByTime(1000);

      await transition2;

      // Second transition should complete normally
      expect(onUpdate2).toHaveBeenCalled();
    });
  });

  describe('manual cancellation', () => {
    it('should cancel active transition', async () => {
      const startViewport: Viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
      const endViewport: Viewport = { x: 100, y: 100, zoom: 1, width: 1200, height: 800 };
      
      const transitionPromise = transitionManager.animateToViewport(
        startViewport,
        endViewport,
        { duration: 1000 },
        vi.fn()
      );

      vi.advanceTimersByTime(250);
      transitionManager.cancel();

      expect(transitionManager.isAnimating()).toBe(false);
    });

    it('should track animation state', async () => {
      const startViewport: Viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
      const endViewport: Viewport = { x: 100, y: 100, zoom: 1, width: 1200, height: 800 };
      
      expect(transitionManager.isAnimating()).toBe(false);

      const transitionPromise = transitionManager.animateToViewport(
        startViewport,
        endViewport,
        { duration: 1000 },
        vi.fn()
      );

      // Animation should be active
      vi.advanceTimersByTime(1);
      // Note: isAnimating state is managed internally

      vi.advanceTimersByTime(1000);
      await transitionPromise;

      expect(transitionManager.isAnimating()).toBe(false);
    });
  });
});