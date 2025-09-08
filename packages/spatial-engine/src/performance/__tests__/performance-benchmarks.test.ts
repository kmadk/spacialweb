import { OptimizedSpatialEngine } from '../optimized-spatial-engine.js';
import { ViewportCuller } from '../viewport-culling.js';
import { ObjectPool, PooledViewport, PooledBoundingBox } from '../object-pool.js';
import { RenderScheduler } from '../render-scheduler.js';
import type { SpatialElement, Viewport } from '../../types.js';

describe('Performance Benchmarks', () => {
  let engine: OptimizedSpatialEngine;
  let culler: ViewportCuller;
  let viewportPool: ObjectPool<PooledViewport>;
  let boundingBoxPool: ObjectPool<PooledBoundingBox>;
  let scheduler: RenderScheduler;

  beforeEach(() => {
    engine = new OptimizedSpatialEngine({
      container: document.createElement('div'),
      width: 1920,
      height: 1080,
    });
    culler = new ViewportCuller();
    viewportPool = new ObjectPool(() => new PooledViewport(), 20, 100);
    boundingBoxPool = new ObjectPool(() => new PooledBoundingBox(), 50, 500);
    scheduler = new RenderScheduler(60);
  });

  afterEach(() => {
    engine.destroy();
    scheduler.clear();
  });

  describe('Viewport Culling Performance', () => {
    it('should handle 10k elements in under 100ms', () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 10000; i++) {
        elements.push({
          id: `element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            width: 100 + Math.random() * 200,
            height: 100 + Math.random() * 200,
          },
          styles: {},
          children: [],
        });
      }

      const viewport: Viewport = {
        x: 5000,
        y: 5000,
        zoom: 1,
        width: 1920,
        height: 1080,
      };

      const startTime = performance.now();
      const result = culler.cullElements(elements, viewport);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(result.visible.length).toBeGreaterThan(0);
      expect(result.visible.length).toBeLessThan(elements.length);
      expect(result.stats.cullingRatio).toBeGreaterThan(0);
    });

    it('should show improved performance with caching on repeated calls', () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 1000; i++) {
        elements.push({
          id: `element-${i}`,
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

      const viewport: Viewport = {
        x: 2500,
        y: 2500,
        zoom: 1,
        width: 1920,
        height: 1080,
      };

      // First call (cold cache)
      const startTime1 = performance.now();
      culler.cullElements(elements, viewport);
      const firstCallTime = performance.now() - startTime1;

      // Second call (warm cache)
      const startTime2 = performance.now();
      culler.cullElements(elements, viewport);
      const secondCallTime = performance.now() - startTime2;

      expect(secondCallTime).toBeLessThan(firstCallTime * 0.8);
    });
  });

  describe('Object Pool Performance', () => {
    it('should be faster than direct allocation for high-frequency objects', () => {
      const iterations = 10000;

      // Direct allocation benchmark
      const startTime1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const viewport = new PooledViewport();
        viewport.set(Math.random(), Math.random(), Math.random(), 1920, 1080);
        viewport.reset();
      }
      const directAllocationTime = performance.now() - startTime1;

      // Pool allocation benchmark
      const startTime2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const viewport = viewportPool.acquire();
        viewport.set(Math.random(), Math.random(), Math.random(), 1920, 1080);
        viewportPool.release(viewport);
      }
      const poolAllocationTime = performance.now() - startTime2;

      expect(poolAllocationTime).toBeLessThan(directAllocationTime * 0.7);
    });

    it('should maintain pool size within limits', () => {
      const poolSize = 50;
      const viewports: PooledViewport[] = [];

      // Acquire more than pool size
      for (let i = 0; i < poolSize * 2; i++) {
        viewports.push(viewportPool.acquire());
      }

      // Release all
      viewports.forEach(v => viewportPool.release(v));

      const stats = viewportPool.getStats();
      expect(stats.available).toBeLessThanOrEqual(100); // maxSize
      expect(stats.inUse).toBe(0);
    });
  });

  describe('Render Scheduler Performance', () => {
    it('should maintain 60fps target by skipping tasks when necessary', (done) => {
      const frameTimes: number[] = [];
      let frameCount = 0;
      const targetFrames = 10;

      const heavyTask = {
        id: 'heavy-task',
        execute: () => {
          // Simulate heavy computation
          const start = performance.now();
          while (performance.now() - start < 20) {
            Math.sqrt(Math.random());
          }
        },
        priority: 1,
        estimatedTime: 5, // Underestimate to test adaptation
      };

      const measureFrame = () => {
        const frameStart = performance.now();
        
        // Schedule multiple heavy tasks
        for (let i = 0; i < 5; i++) {
          scheduler.schedule({
            ...heavyTask,
            id: `heavy-task-${i}`,
          });
        }

        requestAnimationFrame(() => {
          const frameTime = performance.now() - frameStart;
          frameTimes.push(frameTime);
          frameCount++;

          if (frameCount < targetFrames) {
            measureFrame();
          } else {
            const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
            const fps = 1000 / avgFrameTime;
            
            expect(fps).toBeGreaterThan(45); // Allow some leeway but should be close to 60
            done();
          }
        });
      };

      measureFrame();
    });

    it('should adapt frame target based on performance', () => {
      const initialStats = scheduler.getStats();
      const initialTarget = initialStats.currentFrameTarget;

      // Simulate consistent frame drops
      for (let i = 0; i < 15; i++) {
        scheduler['updatePerformanceHistory'](25); // 25ms frames = 40fps
      }

      const adaptedStats = scheduler.getStats();
      expect(adaptedStats.currentFrameTarget).toBeGreaterThan(initialTarget);
    });
  });

  describe('Optimized Spatial Engine Benchmarks', () => {
    it('should handle large element counts efficiently', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 50000; i++) {
        elements.push({
          id: `stress-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 50000,
            y: Math.random() * 50000,
            width: 10 + Math.random() * 90,
            height: 10 + Math.random() * 90,
          },
          styles: {
            fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
          },
          children: [],
        });
      }

      const startTime = performance.now();
      await engine.setElements(elements);
      const loadTime = performance.now() - startTime;

      expect(loadTime).toBeLessThan(2000); // Should load 50k elements in under 2s

      // Test navigation performance
      const navStart = performance.now();
      await engine.flyTo({ x: 25000, y: 25000, width: 1000, height: 1000 });
      const navTime = performance.now() - navStart;

      expect(navTime).toBeLessThan(500); // Navigation should be under 500ms
    });

    it('should maintain memory usage within reasonable bounds', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 100000; i++) {
        elements.push({
          id: `memory-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 100000,
            y: Math.random() * 100000,
            width: 20,
            height: 20,
          },
          styles: {},
          children: [],
        });
      }

      await engine.setElements(elements);

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Should use less than 500MB for 100k elements
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
    });

    it('should demonstrate layer caching benefits', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 1000; i++) {
        elements.push({
          id: `cache-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            width: 100,
            height: 100,
          },
          styles: {},
          children: [],
          layer: Math.floor(i / 100), // 10 layers with 100 elements each
        });
      }

      await engine.setElements(elements);

      // First render (cold cache)
      const startTime1 = performance.now();
      await engine.flyTo({ x: 5000, y: 5000, width: 2000, height: 2000 });
      const firstRenderTime = performance.now() - startTime1;

      // Second render with same viewport (warm cache)
      const startTime2 = performance.now();
      await engine.flyTo({ x: 5000, y: 5000, width: 2000, height: 2000 });
      const secondRenderTime = performance.now() - startTime2;

      expect(secondRenderTime).toBeLessThan(firstRenderTime * 0.5);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle rapid zoom operations smoothly', async () => {
      const elements: SpatialElement[] = [];
      for (let i = 0; i < 10000; i++) {
        elements.push({
          id: `zoom-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 20000,
            y: Math.random() * 20000,
            width: 50,
            height: 50,
          },
          styles: {},
          children: [],
        });
      }

      await engine.setElements(elements);

      const zoomOperations = [
        { zoom: 0.1, duration: 200 },
        { zoom: 5.0, duration: 200 },
        { zoom: 0.5, duration: 200 },
        { zoom: 2.0, duration: 200 },
      ];

      const startTime = performance.now();
      
      for (const op of zoomOperations) {
        await engine.setViewport({
          x: 10000,
          y: 10000,
          zoom: op.zoom,
          width: 1920,
          height: 1080,
        }, { duration: op.duration });
      }

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(1000); // All zoom operations under 1s
    });

    it('should maintain performance during continuous panning', (done) => {
      const frameTimes: number[] = [];
      let frameCount = 0;
      const maxFrames = 60; // 1 second at 60fps

      const panStep = () => {
        const frameStart = performance.now();
        
        engine.setViewport({
          x: frameCount * 10,
          y: frameCount * 10,
          zoom: 1,
          width: 1920,
          height: 1080,
        }, { duration: 0 });

        requestAnimationFrame(() => {
          const frameTime = performance.now() - frameStart;
          frameTimes.push(frameTime);
          frameCount++;

          if (frameCount < maxFrames) {
            panStep();
          } else {
            const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
            const maxFrameTime = Math.max(...frameTimes);
            
            expect(avgFrameTime).toBeLessThan(16.67); // 60fps average
            expect(maxFrameTime).toBeLessThan(33.33); // No frame should drop below 30fps
            done();
          }
        });
      };

      panStep();
    });
  });
});