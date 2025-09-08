/**
 * Tests for Plugin System functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from '../plugin-manager.js';
import type { SpatialPlugin, SpatialBehavior, SpatialElement, Viewport } from '../types.js';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockEngine: any;

  beforeEach(() => {
    mockEngine = {
      getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1, width: 800, height: 600 })),
      on: vi.fn(),
      emit: vi.fn(),
    };
    
    pluginManager = new PluginManager(mockEngine);
    pluginManager.initialize();
  });

  describe('Plugin Registration', () => {
    it('should register a valid plugin', async () => {
      const plugin: SpatialPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        initialize: vi.fn(),
        destroy: vi.fn(),
      };

      const result = await pluginManager.registerPlugin(plugin);
      
      expect(result).toBe(true);
      expect(pluginManager.getPlugin('test-plugin')).toBe(plugin);
      expect(pluginManager.getAllPlugins()).toContain(plugin);
    });

    it('should reject duplicate plugin IDs', async () => {
      const plugin1: SpatialPlugin = {
        id: 'duplicate-plugin',
        name: 'Plugin 1',
        version: '1.0.0',
        initialize: vi.fn(),
        destroy: vi.fn(),
      };

      const plugin2: SpatialPlugin = {
        id: 'duplicate-plugin',
        name: 'Plugin 2',
        version: '2.0.0',
        initialize: vi.fn(),
        destroy: vi.fn(),
      };

      await pluginManager.registerPlugin(plugin1);
      const result = await pluginManager.registerPlugin(plugin2);
      
      expect(result).toBe(false);
    });

    it('should validate plugin structure', async () => {
      const invalidPlugin = {
        id: 'invalid-plugin',
        // Missing required fields
      } as SpatialPlugin;

      const result = await pluginManager.registerPlugin(invalidPlugin);
      
      expect(result).toBe(false);
    });

    it('should unregister plugins', async () => {
      const plugin: SpatialPlugin = {
        id: 'removable-plugin',
        name: 'Removable Plugin',
        version: '1.0.0',
        initialize: vi.fn(),
        destroy: vi.fn(),
      };

      await pluginManager.registerPlugin(plugin);
      await pluginManager.enablePlugin('removable-plugin');
      
      const result = await pluginManager.unregisterPlugin('removable-plugin');
      
      expect(result).toBe(true);
      expect(pluginManager.getPlugin('removable-plugin')).toBeNull();
      expect(plugin.destroy).toHaveBeenCalled();
    });
  });

  describe('Plugin Lifecycle', () => {
    let plugin: SpatialPlugin;

    beforeEach(() => {
      plugin = {
        id: 'lifecycle-plugin',
        name: 'Lifecycle Plugin',
        version: '1.0.0',
        initialize: vi.fn(),
        destroy: vi.fn(),
        onViewportChange: vi.fn(),
        onElementInteraction: vi.fn(),
      };
    });

    it('should enable and initialize plugins', async () => {
      await pluginManager.registerPlugin(plugin);
      const result = await pluginManager.enablePlugin('lifecycle-plugin');
      
      expect(result).toBe(true);
      expect(plugin.initialize).toHaveBeenCalledWith(mockEngine);
      expect(pluginManager.getEnabledPlugins()).toContain(plugin);
    });

    it('should disable plugins', async () => {
      await pluginManager.registerPlugin(plugin);
      await pluginManager.enablePlugin('lifecycle-plugin');
      
      const result = await pluginManager.disablePlugin('lifecycle-plugin');
      
      expect(result).toBe(true);
      expect(pluginManager.getEnabledPlugins()).not.toContain(plugin);
    });

    it('should forward viewport changes to enabled plugins', () => {
      pluginManager.registerPlugin(plugin);
      pluginManager.enablePlugin('lifecycle-plugin');

      const viewport: Viewport = { x: 100, y: 200, zoom: 2, width: 800, height: 600 };
      pluginManager.notifyViewportChange(viewport);

      expect(plugin.onViewportChange).toHaveBeenCalledWith(viewport);
    });

    it('should forward element interactions to enabled plugins', () => {
      pluginManager.registerPlugin(plugin);
      pluginManager.enablePlugin('lifecycle-plugin');

      const element: SpatialElement = {
        id: 'test-element',
        type: 'rectangle',
        position: { x: 0, y: 0 },
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      };

      pluginManager.notifyElementInteraction(element, 'click');

      expect(plugin.onElementInteraction).toHaveBeenCalledWith(element, 'click');
    });
  });

  describe('Behavior System', () => {
    it('should register behaviors', () => {
      const behavior: SpatialBehavior = {
        id: 'test-behavior',
        name: 'Test Behavior',
        apply: vi.fn((elements) => elements),
        shouldApply: vi.fn(() => true),
      };

      pluginManager.registerBehavior(behavior);
      
      expect(pluginManager.getBehavior('test-behavior')).toBe(behavior);
      expect(pluginManager.getAllBehaviors()).toContain(behavior);
    });

    it('should apply behaviors to elements', () => {
      const behavior: SpatialBehavior = {
        id: 'filter-behavior',
        name: 'Filter Behavior',
        apply: vi.fn((elements) => elements.filter(e => e.id !== 'filtered-out')),
        shouldApply: vi.fn(() => true),
      };

      pluginManager.registerBehavior(behavior);

      const elements: SpatialElement[] = [
        {
          id: 'keep-me',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
        {
          id: 'filtered-out',
          type: 'rectangle',
          position: { x: 100, y: 0 },
          bounds: { x: 100, y: 0, width: 100, height: 100 },
        },
      ];

      const context = {
        viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
        timestamp: Date.now(),
        frameRate: 60,
      };

      const result = pluginManager.applyBehaviors(elements, context);

      expect(behavior.shouldApply).toHaveBeenCalledWith(context);
      expect(behavior.apply).toHaveBeenCalledWith(elements, context);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('keep-me');
    });

    it('should skip behaviors when shouldApply returns false', () => {
      const behavior: SpatialBehavior = {
        id: 'conditional-behavior',
        name: 'Conditional Behavior',
        apply: vi.fn((elements) => elements),
        shouldApply: vi.fn(() => false),
      };

      pluginManager.registerBehavior(behavior);

      const elements: SpatialElement[] = [];
      const context = {
        viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
        timestamp: Date.now(),
        frameRate: 60,
      };

      pluginManager.applyBehaviors(elements, context);

      expect(behavior.shouldApply).toHaveBeenCalled();
      expect(behavior.apply).not.toHaveBeenCalled();
    });

    it('should unregister behaviors', () => {
      const behavior: SpatialBehavior = {
        id: 'removable-behavior',
        name: 'Removable Behavior',
        apply: vi.fn(),
        shouldApply: vi.fn(),
      };

      pluginManager.registerBehavior(behavior);
      pluginManager.unregisterBehavior('removable-behavior');

      expect(pluginManager.getBehavior('removable-behavior')).toBeNull();
    });
  });

  describe('Built-in Behaviors', () => {
    it('should include distance-based LOD behavior', () => {
      const lodBehavior = pluginManager.getBehavior('distance-lod');
      expect(lodBehavior).toBeTruthy();
      expect(lodBehavior?.name).toBe('Distance-based Level of Detail');
    });

    it('should apply distance-based LOD', () => {
      const lodBehavior = pluginManager.getBehavior('distance-lod')!;
      
      const elements: SpatialElement[] = [
        {
          id: 'close-element',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          zPosition: 10,
        },
        {
          id: 'far-element',
          type: 'rectangle',
          position: { x: 100, y: 0 },
          bounds: { x: 100, y: 0, width: 100, height: 100 },
          zPosition: 150,
        },
      ];

      const context = {
        viewport: { x: 0, y: 0, z: 0, zoom: 1, width: 800, height: 600 },
        timestamp: Date.now(),
        frameRate: 60,
      };

      const result = lodBehavior.apply(elements, context);

      expect(result[0].lodLevel).toBe(0); // Close element, full detail
      expect(result[1].lodLevel).toBeGreaterThan(0); // Far element, reduced detail
    });

    it('should include occlusion culling behavior', () => {
      const occlusionBehavior = pluginManager.getBehavior('occlusion-culling');
      expect(occlusionBehavior).toBeTruthy();
      expect(occlusionBehavior?.name).toBe('Z-axis Occlusion Culling');
    });

    it('should include adaptive quality behavior', () => {
      const adaptiveBehavior = pluginManager.getBehavior('adaptive-quality');
      expect(adaptiveBehavior).toBeTruthy();
      expect(adaptiveBehavior?.name).toBe('Adaptive Quality Based on Performance');
    });

    it('should apply adaptive quality based on frame rate', () => {
      const adaptiveBehavior = pluginManager.getBehavior('adaptive-quality')!;
      
      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
      ];

      const lowFrameRateContext = {
        viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
        timestamp: Date.now(),
        frameRate: 25, // Low frame rate
      };

      const result = adaptiveBehavior.apply(elements, lowFrameRateContext);
      
      expect(result[0].renderPriority).toBe(0); // Low quality due to poor performance
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin initialization errors gracefully', async () => {
      const faultyPlugin: SpatialPlugin = {
        id: 'faulty-plugin',
        name: 'Faulty Plugin',
        version: '1.0.0',
        initialize: vi.fn(() => { throw new Error('Initialization failed'); }),
        destroy: vi.fn(),
      };

      await pluginManager.registerPlugin(faultyPlugin);
      const result = await pluginManager.enablePlugin('faulty-plugin');

      expect(result).toBe(false);
    });

    it('should handle behavior errors gracefully', () => {
      const faultyBehavior: SpatialBehavior = {
        id: 'faulty-behavior',
        name: 'Faulty Behavior',
        apply: vi.fn(() => { throw new Error('Apply failed'); }),
        shouldApply: vi.fn(() => true),
      };

      pluginManager.registerBehavior(faultyBehavior);

      const elements: SpatialElement[] = [
        {
          id: 'test-element',
          type: 'rectangle',
          position: { x: 0, y: 0 },
          bounds: { x: 0, y: 0, width: 100, height: 100 },
        },
      ];

      const context = {
        viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
        timestamp: Date.now(),
        frameRate: 60,
      };

      // Should not throw, just log error and continue
      const result = pluginManager.applyBehaviors(elements, context);
      
      expect(result).toEqual(elements); // Original elements returned unchanged
    });
  });

  describe('Cleanup', () => {
    it('should destroy all plugins on cleanup', async () => {
      const plugin1: SpatialPlugin = {
        id: 'cleanup-plugin-1',
        name: 'Cleanup Plugin 1',
        version: '1.0.0',
        initialize: vi.fn(),
        destroy: vi.fn(),
      };

      const plugin2: SpatialPlugin = {
        id: 'cleanup-plugin-2',
        name: 'Cleanup Plugin 2',
        version: '1.0.0',
        initialize: vi.fn(),
        destroy: vi.fn(),
      };

      await pluginManager.registerPlugin(plugin1);
      await pluginManager.registerPlugin(plugin2);
      await pluginManager.enablePlugin('cleanup-plugin-1');
      await pluginManager.enablePlugin('cleanup-plugin-2');

      await pluginManager.destroy();

      expect(plugin1.destroy).toHaveBeenCalled();
      expect(plugin2.destroy).toHaveBeenCalled();
      expect(pluginManager.getAllPlugins()).toHaveLength(0);
      expect(pluginManager.getAllBehaviors()).toHaveLength(0);
    });
  });
});