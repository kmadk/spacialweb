import { OptimizedSpatialEngine } from '../optimized-spatial-engine.js';
import { ViewportCuller } from '../viewport-culling.js';
import { ObjectPool, PooledViewport, PooledBoundingBox } from '../object-pool.js';
import { RenderScheduler } from '../render-scheduler.js';
import type { SpatialElement, Viewport } from '../../types.js';

describe('Performance Integration Benchmarks', () => {
  let engine: OptimizedSpatialEngine;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '1920px';
    container.style.height = '1080px';
    document.body.appendChild(container);

    engine = new OptimizedSpatialEngine({
      container,
      width: 1920,
      height: 1080,
    });
  });

  afterEach(() => {
    engine.destroy();
    document.body.removeChild(container);
  });

  describe('Large Dataset Performance', () => {
    it('should handle 100k elements with acceptable performance', async () => {
      const elements: SpatialElement[] = [];
      const gridSize = Math.sqrt(100000);
      
      console.time('Generate 100k elements');
      for (let i = 0; i < 100000; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        
        elements.push({
          id: `perf-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: col * 25,
            y: row * 25,
            width: 20,
            height: 20,
          },
          styles: {
            fill: `hsl(${(i * 137) % 360}, 70%, 50%)`,
          },
          children: [],
          layer: Math.floor(i / 10000), // 10 layers
        });
      }
      console.timeEnd('Generate 100k elements');

      console.time('Load 100k elements into engine');
      await engine.setElements(elements);
      console.timeEnd('Load 100k elements into engine');

      const stats = engine.getPerformanceStats();
      expect(stats.elementCount).toBe(100000);

      // Test navigation performance
      console.time('Navigate to center of dataset');
      await engine.flyTo({
        x: gridSize * 12.5,
        y: gridSize * 12.5,
        width: 1000,
        height: 1000,
      });
      console.timeEnd('Navigate to center of dataset');

      const finalStats = engine.getPerformanceStats();
      expect(finalStats.culling.visibleElements).toBeLessThan(10000);
      expect(finalStats.culling.cullingRatio).toBeGreaterThan(0.9);
      expect(finalStats.rendering.averageFrameTime).toBeLessThan(33); // > 30fps
    }, 30000);

    it('should maintain performance across multiple zoom levels', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 50000; i++) {
        elements.push({
          id: `zoom-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 20000,
            y: Math.random() * 20000,
            width: 10 + Math.random() * 90,
            height: 10 + Math.random() * 90,
          },
          styles: {},
          children: [],
        });
      }

      await engine.setElements(elements);

      const zoomLevels = [0.01, 0.1, 0.5, 1, 2, 5, 10];
      const performanceResults: Array<{
        zoom: number;
        frameTime: number;
        visibleElements: number;
        cullingRatio: number;
      }> = [];

      for (const zoom of zoomLevels) {
        console.time(`Zoom level ${zoom}`);
        await engine.setViewport({
          x: 10000,
          y: 10000,
          zoom,
          width: 1920,
          height: 1080,
        });
        console.timeEnd(`Zoom level ${zoom}`);

        const stats = engine.getPerformanceStats();
        performanceResults.push({
          zoom,
          frameTime: stats.rendering.averageFrameTime,
          visibleElements: stats.culling.visibleElements,
          cullingRatio: stats.culling.cullingRatio,
        });

        // All zoom levels should maintain reasonable performance
        expect(stats.rendering.averageFrameTime).toBeLessThan(50); // > 20fps minimum
      }

      console.table(performanceResults);

      // Higher zoom should show more elements, lower zoom should cull more
      const highZoom = performanceResults.find(r => r.zoom === 10);
      const lowZoom = performanceResults.find(r => r.zoom === 0.01);
      
      expect(lowZoom!.cullingRatio).toBeGreaterThan(highZoom!.cullingRatio);
    }, 20000);
  });

  describe('Memory Usage Optimization', () => {
    it('should demonstrate object pooling efficiency', async () => {
      const viewportPool = new ObjectPool(() => new PooledViewport(), 100, 1000);
      const boundingBoxPool = new ObjectPool(() => new PooledBoundingBox(), 200, 2000);

      const iterations = 50000;
      
      // Benchmark direct allocation
      console.time('Direct allocation');
      for (let i = 0; i < iterations; i++) {
        const viewport = new PooledViewport();
        viewport.set(i, i, 1, 1920, 1080);
        viewport.reset();
        
        const bbox = new PooledBoundingBox();
        bbox.set(i, i, 100, 100);
        bbox.reset();
      }
      console.timeEnd('Direct allocation');

      // Benchmark pooled allocation
      console.time('Pooled allocation');
      for (let i = 0; i < iterations; i++) {
        const viewport = viewportPool.acquire();
        viewport.set(i, i, 1, 1920, 1080);
        viewportPool.release(viewport);
        
        const bbox = boundingBoxPool.acquire();
        bbox.set(i, i, 100, 100);
        boundingBoxPool.release(bbox);
      }
      console.timeEnd('Pooled allocation');

      const viewportStats = viewportPool.getStats();
      const bboxStats = boundingBoxPool.getStats();

      expect(viewportStats.inUse).toBe(0);
      expect(bboxStats.inUse).toBe(0);
      expect(viewportStats.available).toBeGreaterThan(0);
      expect(bboxStats.available).toBeGreaterThan(0);
    });

    it('should manage memory efficiently during continuous navigation', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 25000; i++) {
        elements.push({
          id: `memory-element-${i}`,
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

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      console.log(`Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);

      // Simulate continuous navigation
      const navigationSteps = 100;
      console.time('Continuous navigation');
      
      for (let i = 0; i < navigationSteps; i++) {
        await engine.setViewport({
          x: Math.random() * 50000,
          y: Math.random() * 50000,
          zoom: 0.5 + Math.random() * 2,
          width: 1920,
          height: 1080,
        }, { duration: 0 });
        
        // Occasionally trigger garbage collection
        if (i % 10 === 0 && (global as any).gc) {
          (global as any).gc();
        }
      }
      
      console.timeEnd('Continuous navigation');

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB increase
    }, 15000);
  });

  describe('Render Scheduler Integration', () => {
    it('should maintain frame rate under heavy computational load', (done) => {
      const scheduler = new RenderScheduler(60);
      const frameTimes: number[] = [];
      let frameCount = 0;
      const maxFrames = 60; // Test for 1 second

      const heavyComputationTask = (id: string) => ({
        id,
        execute: () => {
          // Simulate heavy computation
          const start = performance.now();
          while (performance.now() - start < Math.random() * 15) {
            Math.sqrt(Math.random() * 1000000);
          }
        },
        priority: 1,
        estimatedTime: 5,
      });

      const measureFrame = () => {
        const frameStart = performance.now();
        
        // Schedule multiple heavy tasks per frame
        for (let i = 0; i < 8; i++) {
          scheduler.schedule(heavyComputationTask(`heavy-${frameCount}-${i}`));
        }

        requestAnimationFrame(() => {
          const frameTime = performance.now() - frameStart;
          frameTimes.push(frameTime);
          frameCount++;

          if (frameCount < maxFrames) {
            measureFrame();
          } else {
            const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
            const minFrameTime = Math.min(...frameTimes);
            const maxFrameTime = Math.max(...frameTimes);
            const fps = 1000 / avgFrameTime;

            console.log(`Frame time stats: avg=${avgFrameTime.toFixed(2)}ms, min=${minFrameTime.toFixed(2)}ms, max=${maxFrameTime.toFixed(2)}ms`);
            console.log(`Average FPS: ${fps.toFixed(1)}`);

            expect(fps).toBeGreaterThan(40); // Should maintain > 40fps under load
            expect(maxFrameTime).toBeLessThan(50); // No frame should exceed 50ms
            
            scheduler.clear();
            done();
          }
        });
      };

      measureFrame();
    }, 10000);

    it('should demonstrate adaptive frame budgeting', async () => {
      const scheduler = new RenderScheduler(60);
      
      // Simulate varying computational load
      const lightTask = {
        id: 'light',
        execute: () => Math.sqrt(Math.random()),
        priority: 1,
        estimatedTime: 1,
      };

      const heavyTask = {
        id: 'heavy',
        execute: () => {
          const start = performance.now();
          while (performance.now() - start < 10) {
            Math.sqrt(Math.random());
          }
        },
        priority: 1,
        estimatedTime: 10,
      };

      // Start with light load
      for (let i = 0; i < 50; i++) {
        scheduler.schedule({ ...lightTask, id: `light-${i}` });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      const lightLoadStats = scheduler.getStats();

      // Switch to heavy load
      for (let i = 0; i < 20; i++) {
        scheduler.schedule({ ...heavyTask, id: `heavy-${i}` });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      const heavyLoadStats = scheduler.getStats();

      console.log('Light load target:', lightLoadStats.currentFrameTarget);
      console.log('Heavy load target:', heavyLoadStats.currentFrameTarget);

      // Frame target should adapt to load
      expect(heavyLoadStats.currentFrameTarget).toBeGreaterThan(lightLoadStats.currentFrameTarget);
      
      scheduler.clear();
    });
  });

  describe('Real-World Scenario Benchmarks', () => {
    it('should handle typical design file with 10k elements', async () => {
      // Simulate a typical large design file
      const elements: SpatialElement[] = [];
      
      // Background elements
      for (let i = 0; i < 100; i++) {
        elements.push({
          id: `bg-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 5000,
            y: Math.random() * 3000,
            width: 500 + Math.random() * 1000,
            height: 300 + Math.random() * 600,
          },
          styles: { fill: '#f0f0f0' },
          children: [],
          layer: 0,
        });
      }

      // UI components
      for (let i = 0; i < 5000; i++) {
        elements.push({
          id: `ui-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 5000,
            y: Math.random() * 3000,
            width: 10 + Math.random() * 200,
            height: 10 + Math.random() * 100,
          },
          styles: { fill: `hsl(${Math.random() * 360}, 70%, 50%)` },
          children: [],
          layer: 1,
        });
      }

      // Text elements
      for (let i = 0; i < 3000; i++) {
        elements.push({
          id: `text-${i}`,
          type: 'text',
          bounds: {
            x: Math.random() * 5000,
            y: Math.random() * 3000,
            width: 50 + Math.random() * 300,
            height: 20 + Math.random() * 50,
          },
          styles: { fontSize: '14px', fill: '#333333' },
          children: [],
          layer: 2,
        });
      }

      // Icons and small elements
      for (let i = 0; i < 1900; i++) {
        elements.push({
          id: `icon-${i}`,
          type: 'circle',
          bounds: {
            x: Math.random() * 5000,
            y: Math.random() * 3000,
            width: 16 + Math.random() * 48,
            height: 16 + Math.random() * 48,
          },
          styles: { fill: '#666666' },
          children: [],
          layer: 3,
        });
      }

      console.time('Load design file');
      await engine.setElements(elements);
      console.timeEnd('Load design file');

      // Simulate typical navigation patterns
      const navigationScenarios = [
        { name: 'Overview', viewport: { x: 2500, y: 1500, zoom: 0.3 } },
        { name: 'Page detail', viewport: { x: 1000, y: 800, zoom: 1.2 } },
        { name: 'Component focus', viewport: { x: 500, y: 400, zoom: 3.0 } },
        { name: 'Text inspection', viewport: { x: 300, y: 200, zoom: 8.0 } },
      ];

      for (const scenario of navigationScenarios) {
        console.time(`Navigate to ${scenario.name}`);
        await engine.setViewport({
          ...scenario.viewport,
          width: 1920,
          height: 1080,
        });
        console.timeEnd(`Navigate to ${scenario.name}`);

        const stats = engine.getPerformanceStats();
        console.log(`${scenario.name} - Visible: ${stats.culling.visibleElements}, Culled: ${stats.culling.culledElements}, Frame time: ${stats.rendering.averageFrameTime.toFixed(2)}ms`);

        expect(stats.rendering.averageFrameTime).toBeLessThan(25); // > 40fps
      }
    }, 20000);

    it('should handle rapid viewport changes smoothly', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 15000; i++) {
        elements.push({
          id: `rapid-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            width: 20,
            height: 20,
          },
          styles: {},
          children: [],
        });
      }

      await engine.setElements(elements);

      // Simulate rapid viewport changes (like dragging/panning)
      const viewportChanges = 200;
      const frameTimes: number[] = [];

      console.time('Rapid viewport changes');
      for (let i = 0; i < viewportChanges; i++) {
        const start = performance.now();
        
        await engine.setViewport({
          x: Math.random() * 10000,
          y: Math.random() * 10000,
          zoom: 0.5 + Math.random() * 3,
          width: 1920,
          height: 1080,
        }, { duration: 0 });
        
        frameTimes.push(performance.now() - start);
      }
      console.timeEnd('Rapid viewport changes');

      const avgUpdateTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
      const maxUpdateTime = Math.max(...frameTimes);

      console.log(`Average viewport update time: ${avgUpdateTime.toFixed(2)}ms`);
      console.log(`Maximum viewport update time: ${maxUpdateTime.toFixed(2)}ms`);

      expect(avgUpdateTime).toBeLessThan(10); // Should average under 10ms
      expect(maxUpdateTime).toBeLessThan(30); // No update should exceed 30ms
    }, 15000);
  });

  describe('Performance Regression Tests', () => {
    it('should not degrade with repeated operations', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 5000; i++) {
        elements.push({
          id: `regression-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 5000,
            y: Math.random() * 5000,
            width: 50,
            height: 50,
          },
          styles: {},
          children: [],
        });
      }

      await engine.setElements(elements);

      const operations = 50;
      const firstBatch: number[] = [];
      const lastBatch: number[] = [];

      // First batch of operations
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await engine.flyTo({
          x: Math.random() * 5000,
          y: Math.random() * 5000,
          width: 1000,
          height: 1000,
        });
        firstBatch.push(performance.now() - start);
      }

      // Perform many operations
      for (let i = 0; i < operations - 20; i++) {
        await engine.flyTo({
          x: Math.random() * 5000,
          y: Math.random() * 5000,
          width: 1000,
          height: 1000,
        });
      }

      // Last batch of operations
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await engine.flyTo({
          x: Math.random() * 5000,
          y: Math.random() * 5000,
          width: 1000,
          height: 1000,
        });
        lastBatch.push(performance.now() - start);
      }

      const firstAvg = firstBatch.reduce((a, b) => a + b) / firstBatch.length;
      const lastAvg = lastBatch.reduce((a, b) => a + b) / lastBatch.length;

      console.log(`First batch average: ${firstAvg.toFixed(2)}ms`);
      console.log(`Last batch average: ${lastAvg.toFixed(2)}ms`);

      // Performance should not degrade significantly
      expect(lastAvg).toBeLessThan(firstAvg * 1.5); // Allow 50% degradation max
    }, 15000);
  });
});