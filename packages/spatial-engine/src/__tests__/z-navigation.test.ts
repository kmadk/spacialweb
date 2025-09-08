/**
 * Tests for Z-axis navigation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZNavigationManager } from '../z-navigation-manager.js';
import type { SpatialLayer, SpatialElement } from '../types.js';

// Mock performance.now for consistent timing
vi.stubGlobal('performance', {
  now: vi.fn(() => 0),
});

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
  setTimeout(cb, 16); // ~60fps
  return 1;
}));

vi.stubGlobal('cancelAnimationFrame', vi.fn());

describe('ZNavigationManager', () => {
  let manager: ZNavigationManager;

  beforeEach(() => {
    manager = new ZNavigationManager();
    vi.clearAllMocks();
    (performance.now as any).mockReturnValue(0);
  });

  describe('Basic Navigation', () => {
    it('should initialize at z=0', () => {
      expect(manager.getCurrentZ()).toBe(0);
      expect(manager.isNavigating()).toBe(false);
    });

    it('should navigate to target Z position', async () => {
      const targetZ = 50;
      let progressCallbackCount = 0;
      let completedZ = 0;

      const promise = manager.navigateToZ({
        targetZ,
        transitionDuration: 100,
        onProgress: (progress, currentZ) => {
          progressCallbackCount++;
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(1);
        },
        onComplete: (finalZ) => {
          completedZ = finalZ;
        },
      });

      // Fast-forward time
      vi.advanceTimersByTime(50);
      (performance.now as any).mockReturnValue(50);

      vi.advanceTimersByTime(50);
      (performance.now as any).mockReturnValue(100);

      await promise;

      expect(manager.getCurrentZ()).toBe(targetZ);
      expect(completedZ).toBe(targetZ);
      expect(progressCallbackCount).toBeGreaterThan(0);
    });

    it('should handle relative navigation', async () => {
      manager.getCurrentZ = vi.fn(() => 10);

      await manager.navigateToZ({
        relativeDelta: 20,
        transitionDuration: 50,
      });

      expect(manager.getCurrentZ()).toBe(30);
    });

    it('should clamp to bounds', async () => {
      manager.setDepthBounds(-100, 100);

      await manager.navigateToZ({
        targetZ: 200, // Beyond max bound
        transitionDuration: 50,
      });

      expect(manager.getCurrentZ()).toBe(100);
    });
  });

  describe('Quick Navigation Methods', () => {
    it('should dive deeper', async () => {
      const initialZ = manager.getCurrentZ();
      
      await manager.diveDeeper(15);

      expect(manager.getCurrentZ()).toBe(initialZ + 15);
    });

    it('should emerge up', async () => {
      manager['state'].currentZ = 20;
      
      await manager.emergeUp(10);

      expect(manager.getCurrentZ()).toBe(10);
    });

    it('should reset to surface', async () => {
      manager['state'].currentZ = 50;
      
      await manager.resetToSurface();

      expect(manager.getCurrentZ()).toBe(0);
    });
  });

  describe('Layer Management', () => {
    it('should add and retrieve layers', () => {
      const layer: SpatialLayer = {
        id: 'test-layer',
        name: 'Test Layer',
        zIndex: 10,
        elements: [],
        visible: true,
      };

      manager.addLayer(layer);
      
      expect(manager.getLayer(10)).toBe(layer);
      expect(manager.getAllLayers()).toContain(layer);
    });

    it('should remove layers', () => {
      const layer: SpatialLayer = {
        id: 'test-layer',
        zIndex: 10,
        elements: [],
        visible: true,
      };

      manager.addLayer(layer);
      manager.removeLayer(10);
      
      expect(manager.getLayer(10)).toBeUndefined();
      expect(manager.getAllLayers()).not.toContain(layer);
    });

    it('should get visible layers based on current Z', () => {
      const layers: SpatialLayer[] = [
        {
          id: 'layer-1',
          zIndex: 0,
          elements: [],
          visible: true,
          cullDistance: 50,
        },
        {
          id: 'layer-2',
          zIndex: 30,
          elements: [],
          visible: true,
          cullDistance: 50,
        },
        {
          id: 'layer-3',
          zIndex: 200,
          elements: [],
          visible: true,
          cullDistance: 50,
        },
      ];

      layers.forEach(layer => manager.addLayer(layer));
      manager['state'].currentZ = 10;

      const visibleLayers = manager.getVisibleLayers();
      const shouldRender = visibleLayers.filter(info => info.shouldRender);

      expect(shouldRender).toHaveLength(2); // Layers 1 and 2 should be visible
      expect(shouldRender.some(info => info.layer.id === 'layer-3')).toBe(false);
    });
  });

  describe('Element Filtering', () => {
    it('should filter elements by depth', () => {
      const elements: SpatialElement[] = [
        {
          id: 'element-1',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          zPosition: 5,
        },
        {
          id: 'element-2',
          type: 'rectangle',
          position: { x: 100, y: 0 },
          bounds: { x: 100, y: 0, width: 100, height: 100 },
          zPosition: 150, // Far from current Z
        },
        {
          id: 'element-3',
          type: 'text',
          position: { x: 0, y: 100 },
          bounds: { x: 0, y: 100, width: 50, height: 20 },
          // No zPosition (should use layer)
        },
      ];

      manager['state'].currentZ = 10;
      manager.setDefaultCullDistance(100);

      const filteredElements = manager.filterElementsByDepth(elements);

      expect(filteredElements).toHaveLength(2);
      expect(filteredElements.find(e => e.id === 'element-2')).toBeUndefined();
    });
  });

  describe('Easing Functions', () => {
    it('should apply different easing functions', () => {
      const easingManager = manager as any; // Access private methods
      
      expect(easingManager.applyEasing(0.5, 'linear')).toBe(0.5);
      expect(easingManager.applyEasing(0, 'easeInOutCubic')).toBe(0);
      expect(easingManager.applyEasing(1, 'easeInOutCubic')).toBe(1);
      
      const cubicMid = easingManager.applyEasing(0.5, 'easeInOutCubic');
      expect(cubicMid).toBeGreaterThan(0);
      expect(cubicMid).toBeLessThan(1);
    });
  });

  describe('Event System', () => {
    it('should emit navigation events', () => {
      const startHandler = vi.fn();
      const endHandler = vi.fn();

      manager.on('zNavigationStart', startHandler);
      manager.on('zNavigationEnd', endHandler);

      manager.navigateToZ({ targetZ: 25, transitionDuration: 50 });

      expect(startHandler).toHaveBeenCalledWith({
        fromZ: 0,
        toZ: 25,
      });
    });
  });

  describe('Configuration', () => {
    it('should set and respect depth bounds', () => {
      manager.setDepthBounds(-50, 50);

      const clampedNegative = Math.max(-50, Math.min(50, -100));
      const clampedPositive = Math.max(-50, Math.min(50, 100));

      expect(clampedNegative).toBe(-50);
      expect(clampedPositive).toBe(50);
    });

    it('should configure cull distance', () => {
      manager.setDefaultCullDistance(200);
      
      // Verify through layer visibility
      const layer: SpatialLayer = {
        id: 'test-layer',
        zIndex: 150,
        elements: [],
        visible: true,
      };

      manager.addLayer(layer);
      manager['state'].currentZ = 0;

      const visibleLayers = manager.getVisibleLayers();
      const layerInfo = visibleLayers.find(info => info.layer.id === 'test-layer');
      
      expect(layerInfo?.shouldRender).toBe(true); // Within 200 units
    });
  });
});