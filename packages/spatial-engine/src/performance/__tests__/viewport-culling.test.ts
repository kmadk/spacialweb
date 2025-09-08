import { ViewportCuller } from '../viewport-culling.js';
import type { SpatialElement, Viewport } from '../../types.js';

describe('ViewportCuller', () => {
  let culler: ViewportCuller;

  beforeEach(() => {
    culler = new ViewportCuller();
  });

  describe('basic culling functionality', () => {
    it('should cull elements outside viewport', () => {
      const elements: SpatialElement[] = [
        {
          id: 'visible-1',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
          children: [],
        },
        {
          id: 'outside-1',
          type: 'rectangle',
          bounds: { x: 2000, y: 2000, width: 100, height: 100 },
          styles: {},
          children: [],
        },
        {
          id: 'visible-2',
          type: 'rectangle',
          bounds: { x: 50, y: 50, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      const viewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, viewport);

      expect(result.visible).toHaveLength(2);
      expect(result.visible.map(e => e.id)).toEqual(['visible-1', 'visible-2']);
      expect(result.stats.culledElements).toBe(1);
      expect(result.stats.cullingRatio).toBeCloseTo(1/3);
    });

    it('should cull elements that are too small to see', () => {
      const elements: SpatialElement[] = [
        {
          id: 'visible-large',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
          children: [],
        },
        {
          id: 'too-small',
          type: 'rectangle',
          bounds: { x: 50, y: 50, width: 0.1, height: 0.1 },
          styles: {},
          children: [],
        },
      ];

      const viewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, viewport);

      expect(result.visible).toHaveLength(1);
      expect(result.visible[0].id).toBe('visible-large');
    });

    it('should cull elements that are too far away', () => {
      const elements: SpatialElement[] = [
        {
          id: 'near',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 50, height: 50 },
          styles: {},
          children: [],
        },
        {
          id: 'far',
          type: 'rectangle',
          bounds: { x: 10000, y: 10000, width: 50, height: 50 },
          styles: {},
          children: [],
        },
      ];

      const viewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, viewport);

      expect(result.visible).toHaveLength(1);
      expect(result.visible[0].id).toBe('near');
    });
  });

  describe('frustum caching', () => {
    it('should cache frustum calculations for identical viewports', () => {
      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      const viewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      // First call
      const result1 = culler.cullElements(elements, viewport);
      const firstCallTime = result1.stats.lastUpdateTime;

      // Second call with same viewport
      const result2 = culler.cullElements(elements, viewport);
      const secondCallTime = result2.stats.lastUpdateTime;

      expect(secondCallTime).toBeLessThan(firstCallTime);
    });

    it('should clear cache when viewport changes significantly', () => {
      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      const viewport1: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const viewport2: Viewport = {
        x: 200,
        y: 200,
        zoom: 2,
        width: 400,
        height: 300,
      };

      culler.cullElements(elements, viewport1);
      const result = culler.cullElements(elements, viewport2);

      // Should recalculate for new viewport
      expect(result.stats.lastUpdateTime).toBeGreaterThan(0);
    });

    it('should handle precision-based viewport hashing', () => {
      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      const viewport1: Viewport = {
        x: 100.001,
        y: 100.001,
        zoom: 1.001,
        width: 400,
        height: 300,
      };

      const viewport2: Viewport = {
        x: 100.002,
        y: 100.002,
        zoom: 1.002,
        width: 400,
        height: 300,
      };

      culler.cullElements(elements, viewport1);
      const result = culler.cullElements(elements, viewport2);

      // Small differences should use cache
      expect(result.stats.lastUpdateTime).toBeLessThan(1);
    });
  });

  describe('zoom level handling', () => {
    it('should adjust culling based on zoom level', () => {
      const elements: SpatialElement[] = [
        {
          id: 'small-element',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 1, height: 1 },
          styles: {},
          children: [],
        },
      ];

      const highZoomViewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 10,
        width: 400,
        height: 300,
      };

      const lowZoomViewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 0.1,
        width: 400,
        height: 300,
      };

      const highZoomResult = culler.cullElements(elements, highZoomViewport);
      const lowZoomResult = culler.cullElements(elements, lowZoomViewport);

      expect(highZoomResult.visible).toHaveLength(1); // Visible at high zoom
      expect(lowZoomResult.visible).toHaveLength(0); // Culled at low zoom
    });

    it('should include padding in frustum calculation', () => {
      const elements: SpatialElement[] = [
        {
          id: 'edge-element',
          type: 'rectangle',
          bounds: { x: -50, y: -50, width: 50, height: 50 }, // Just outside viewport
          styles: {},
          children: [],
        },
      ];

      const viewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, viewport);

      // Should be visible due to padding
      expect(result.visible).toHaveLength(1);
    });
  });

  describe('performance optimization', () => {
    it('should provide accurate culling statistics', () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 1000; i++) {
        elements.push({
          id: `element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            width: 50,
            height: 50,
          },
          styles: {},
          children: [],
        });
      }

      const viewport: Viewport = {
        x: 1000,
        y: 1000,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, viewport);

      expect(result.stats.totalElements).toBe(1000);
      expect(result.stats.visibleElements + result.stats.culledElements).toBe(1000);
      expect(result.stats.cullingRatio).toBe(result.stats.culledElements / 1000);
      expect(result.stats.lastUpdateTime).toBeGreaterThan(0);
    });

    it('should clear cache manually', () => {
      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      const viewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      culler.cullElements(elements, viewport);
      culler.clearCache();

      // After clearing cache, next call should recalculate
      const result = culler.cullElements(elements, viewport);
      expect(result.stats.lastUpdateTime).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty element list', () => {
      const elements: SpatialElement[] = [];
      const viewport: Viewport = {
        x: 0,
        y: 0,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, viewport);

      expect(result.visible).toHaveLength(0);
      expect(result.stats.totalElements).toBe(0);
      expect(result.stats.cullingRatio).toBe(0);
    });

    it('should handle zero-sized elements', () => {
      const elements: SpatialElement[] = [
        {
          id: 'zero-size',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 0, height: 0 },
          styles: {},
          children: [],
        },
      ];

      const viewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 1,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, viewport);

      expect(result.visible).toHaveLength(0); // Zero-sized elements should be culled
    });

    it('should handle extreme zoom levels', () => {
      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 100, height: 100 },
          styles: {},
          children: [],
        },
      ];

      const extremeZoomViewport: Viewport = {
        x: 100,
        y: 100,
        zoom: 0.001,
        width: 400,
        height: 300,
      };

      const result = culler.cullElements(elements, extremeZoomViewport);

      expect(result.stats.totalElements).toBe(1);
      expect(typeof result.stats.cullingRatio).toBe('number');
    });
  });
});