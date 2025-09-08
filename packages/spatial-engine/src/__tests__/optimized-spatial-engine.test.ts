import { OptimizedSpatialEngine } from '../optimized-spatial-engine.js';
import type { SpatialElement, Viewport, TransitionOptions } from '../types.js';

describe('OptimizedSpatialEngine', () => {
  let engine: OptimizedSpatialEngine;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    engine = new OptimizedSpatialEngine({
      container,
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    engine.destroy();
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should initialize with proper configuration', () => {
      const viewport = engine.getViewport();
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
      expect(viewport.zoom).toBe(1);
    });

    it('should handle invalid container', () => {
      expect(() => {
        new OptimizedSpatialEngine({
          container: null as any,
          width: 800,
          height: 600,
        });
      }).toThrow();
    });
  });

  describe('element management', () => {
    it('should set and retrieve elements', async () => {
      const elements: SpatialElement[] = [
        {
          id: 'element-1',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: { fill: '#ff0000' },
          children: [],
        },
        {
          id: 'element-2',
          type: 'circle',
          bounds: { x: 200, y: 200, width: 50, height: 50 },
          styles: { fill: '#00ff00' },
          children: [],
        },
      ];

      await engine.setElements(elements);
      const retrievedElements = engine.getElements();

      expect(retrievedElements).toHaveLength(2);
      expect(retrievedElements[0].id).toBe('element-1');
      expect(retrievedElements[1].id).toBe('element-2');
    });

    it('should handle empty element array', async () => {
      await engine.setElements([]);
      const elements = engine.getElements();
      expect(elements).toHaveLength(0);
    });

    it('should update elements incrementally', async () => {
      const initialElements: SpatialElement[] = [
        {
          id: 'element-1',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: { fill: '#ff0000' },
          children: [],
        },
      ];

      await engine.setElements(initialElements);

      const updatedElements: SpatialElement[] = [
        {
          id: 'element-1',
          type: 'rectangle',
          bounds: { x: 50, y: 50, width: 100, height: 100 }, // Updated position
          styles: { fill: '#ff0000' },
          children: [],
        },
        {
          id: 'element-2',
          type: 'circle',
          bounds: { x: 200, y: 200, width: 50, height: 50 },
          styles: { fill: '#00ff00' },
          children: [],
        },
      ];

      await engine.setElements(updatedElements);
      const elements = engine.getElements();

      expect(elements).toHaveLength(2);
      expect(elements[0].bounds.x).toBe(50);
      expect(elements[0].bounds.y).toBe(50);
    });
  });

  describe('viewport management', () => {
    it('should set viewport correctly', async () => {
      const targetViewport: Viewport = {
        x: 100,
        y: 200,
        zoom: 2,
        width: 800,
        height: 600,
      };

      await engine.setViewport(targetViewport);
      const currentViewport = engine.getViewport();

      expect(currentViewport.x).toBeCloseTo(100);
      expect(currentViewport.y).toBeCloseTo(200);
      expect(currentViewport.zoom).toBeCloseTo(2);
    });

    it('should handle viewport transitions', async () => {
      const targetViewport: Viewport = {
        x: 300,
        y: 400,
        zoom: 1.5,
        width: 800,
        height: 600,
      };

      const options: TransitionOptions = {
        duration: 500,
        easing: 'ease-out',
      };

      const transitionPromise = engine.setViewport(targetViewport, options);
      expect(transitionPromise).toBeInstanceOf(Promise);

      await transitionPromise;
      const finalViewport = engine.getViewport();
      expect(finalViewport.x).toBeCloseTo(300);
      expect(finalViewport.y).toBeCloseTo(400);
      expect(finalViewport.zoom).toBeCloseTo(1.5);
    });

    it('should handle immediate viewport changes', async () => {
      const targetViewport: Viewport = {
        x: 500,
        y: 600,
        zoom: 0.5,
        width: 800,
        height: 600,
      };

      await engine.setViewport(targetViewport, { duration: 0 });
      const currentViewport = engine.getViewport();

      expect(currentViewport.x).toBeCloseTo(500);
      expect(currentViewport.y).toBeCloseTo(600);
      expect(currentViewport.zoom).toBeCloseTo(0.5);
    });
  });

  describe('navigation methods', () => {
    beforeEach(async () => {
      const elements: SpatialElement[] = [
        {
          id: 'target-element',
          type: 'rectangle',
          bounds: { x: 1000, y: 1000, width: 200, height: 200 },
          styles: { fill: '#ff0000' },
          children: [],
        },
      ];
      await engine.setElements(elements);
    });

    it('should fly to element by ID', async () => {
      await engine.flyTo('target-element');
      const viewport = engine.getViewport();

      // Should center on the element
      expect(viewport.x).toBeCloseTo(1100); // center x
      expect(viewport.y).toBeCloseTo(1100); // center y
    });

    it('should fly to element object', async () => {
      const element = engine.getElements()[0];
      await engine.flyTo(element);
      const viewport = engine.getViewport();

      expect(viewport.x).toBeCloseTo(1100);
      expect(viewport.y).toBeCloseTo(1100);
    });

    it('should fly to bounding box', async () => {
      const bounds = { x: 500, y: 500, width: 400, height: 400 };
      await engine.flyTo(bounds);
      const viewport = engine.getViewport();

      expect(viewport.x).toBeCloseTo(700); // center x
      expect(viewport.y).toBeCloseTo(700); // center y
    });

    it('should zoom to fit all elements', async () => {
      const elements: SpatialElement[] = [
        {
          id: 'element-1',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
          children: [],
        },
        {
          id: 'element-2',
          type: 'rectangle',
          bounds: { x: 2000, y: 2000, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      await engine.setElements(elements);
      await engine.zoomToFit();

      const viewport = engine.getViewport();
      expect(viewport.zoom).toBeLessThan(1); // Should zoom out to fit all elements
    });

    it('should handle zoom to fit with no elements', async () => {
      await engine.setElements([]);
      await engine.zoomToFit();

      const viewport = engine.getViewport();
      expect(viewport.zoom).toBe(1);
    });

    it('should reset viewport to home position', async () => {
      // Move viewport away from home
      await engine.setViewport({ x: 1000, y: 1000, zoom: 5, width: 800, height: 600 });

      await engine.resetViewport();
      const viewport = engine.getViewport();

      expect(viewport.x).toBeCloseTo(0);
      expect(viewport.y).toBeCloseTo(0);
      expect(viewport.zoom).toBeCloseTo(1);
    });
  });

  describe('element finding', () => {
    beforeEach(async () => {
      const elements: SpatialElement[] = [
        {
          id: 'findable-element',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 100, height: 100 },
          styles: {},
          children: [],
        },
        {
          id: 'another-element',
          type: 'circle',
          bounds: { x: 300, y: 300, width: 50, height: 50 },
          styles: {},
          children: [],
        },
      ];
      await engine.setElements(elements);
    });

    it('should find element by ID', () => {
      const element = engine.findElement('findable-element');
      expect(element).toBeDefined();
      expect(element!.id).toBe('findable-element');
    });

    it('should return undefined for non-existent element', () => {
      const element = engine.findElement('non-existent');
      expect(element).toBeUndefined();
    });

    it('should find elements at point', () => {
      const elementsAtPoint = engine.getElementsAt(150, 150);
      expect(elementsAtPoint).toHaveLength(1);
      expect(elementsAtPoint[0].id).toBe('findable-element');
    });

    it('should find elements in region', () => {
      const elementsInRegion = engine.getElementsInRegion({
        x: 50,
        y: 50,
        width: 200,
        height: 200,
      });
      expect(elementsInRegion).toHaveLength(1);
      expect(elementsInRegion[0].id).toBe('findable-element');
    });

    it('should return empty array for region with no elements', () => {
      const elementsInRegion = engine.getElementsInRegion({
        x: 1000,
        y: 1000,
        width: 100,
        height: 100,
      });
      expect(elementsInRegion).toHaveLength(0);
    });
  });

  describe('event handling', () => {
    it('should register and trigger viewport change events', (done) => {
      let eventTriggered = false;

      engine.on('viewportChange', (viewport) => {
        eventTriggered = true;
        expect(viewport.x).toBeCloseTo(200);
        expect(viewport.y).toBeCloseTo(300);
        done();
      });

      engine.setViewport({
        x: 200,
        y: 300,
        zoom: 1,
        width: 800,
        height: 600,
      });

      setTimeout(() => {
        if (!eventTriggered) {
          done(new Error('Viewport change event was not triggered'));
        }
      }, 100);
    });

    it('should register and trigger element click events', async (done) => {
      const elements: SpatialElement[] = [
        {
          id: 'clickable-element',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      await engine.setElements(elements);

      engine.on('elementClick', (element, event) => {
        expect(element.id).toBe('clickable-element');
        expect(event.point).toBeDefined();
        done();
      });

      // Simulate click
      engine['handleElementClick']('clickable-element', {
        point: [150, 150],
        coordinate: [150, 150],
      });
    });

    it('should unregister event listeners', () => {
      const handler = jest.fn();
      engine.on('viewportChange', handler);
      engine.off('viewportChange', handler);

      engine.setViewport({
        x: 100,
        y: 100,
        zoom: 1,
        width: 800,
        height: 600,
      });

      setTimeout(() => {
        expect(handler).not.toHaveBeenCalled();
      }, 50);
    });
  });

  describe('performance optimizations', () => {
    it('should demonstrate viewport culling benefits', async () => {
      // Create many elements spread across large area
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 10000; i++) {
        elements.push({
          id: `element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 50000,
            y: Math.random() * 50000,
            width: 20,
            height: 20,
          },
          styles: {},
          children: [],
        });
      }

      await engine.setElements(elements);

      // Focus on small area
      await engine.setViewport({
        x: 1000,
        y: 1000,
        zoom: 2,
        width: 800,
        height: 600,
      });

      const stats = engine.getPerformanceStats();
      expect(stats.culling.cullingRatio).toBeGreaterThan(0.5); // Most elements should be culled
    });

    it('should use layer caching effectively', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 1000; i++) {
        elements.push({
          id: `layer-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: i * 10,
            y: Math.floor(i / 100) * 100,
            width: 8,
            height: 8,
          },
          styles: {},
          children: [],
          layer: Math.floor(i / 100), // 10 layers
        });
      }

      await engine.setElements(elements);

      const stats1 = engine.getPerformanceStats();
      
      // Same viewport again should use cache
      await engine.setViewport(engine.getViewport());
      
      const stats2 = engine.getPerformanceStats();
      expect(stats2.layerCache.cacheHits).toBeGreaterThan(stats1.layerCache.cacheHits);
    });

    it('should maintain target frame rate', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 5000; i++) {
        elements.push({
          id: `perf-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            width: 10,
            height: 10,
          },
          styles: { fill: `hsl(${Math.random() * 360}, 70%, 50%)` },
          children: [],
        });
      }

      await engine.setElements(elements);

      const stats = engine.getPerformanceStats();
      expect(stats.rendering.averageFrameTime).toBeLessThan(20); // Should maintain > 50fps
    });
  });

  describe('error handling', () => {
    it('should handle invalid element data gracefully', async () => {
      const invalidElements = [
        {
          id: 'invalid-element',
          type: 'rectangle',
          bounds: null as any,
          styles: {},
          children: [],
        },
      ];

      await expect(engine.setElements(invalidElements)).rejects.toThrow();
    });

    it('should handle invalid viewport data', async () => {
      const invalidViewport = {
        x: NaN,
        y: 100,
        zoom: -1,
        width: 800,
        height: 600,
      };

      await expect(engine.setViewport(invalidViewport)).rejects.toThrow();
    });

    it('should handle destroyed engine gracefully', () => {
      engine.destroy();

      expect(() => engine.getViewport()).toThrow();
      expect(() => engine.getElements()).toThrow();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const initialStats = engine.getPerformanceStats();
      engine.destroy();

      // Engine should be marked as destroyed
      expect(() => engine.getViewport()).toThrow();
    });

    it('should remove event listeners on destroy', () => {
      const handler = jest.fn();
      engine.on('viewportChange', handler);
      
      engine.destroy();
      
      // Creating new engine shouldn't trigger old handlers
      const newEngine = new OptimizedSpatialEngine({
        container: document.createElement('div'),
        width: 800,
        height: 600,
      });

      newEngine.setViewport({ x: 100, y: 100, zoom: 1, width: 800, height: 600 });
      
      setTimeout(() => {
        expect(handler).not.toHaveBeenCalled();
        newEngine.destroy();
      }, 50);
    });
  });
});