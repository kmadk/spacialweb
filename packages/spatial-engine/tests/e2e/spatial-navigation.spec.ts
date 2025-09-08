import { test, expect, Page } from '@playwright/test';

test.describe('Spatial Navigation E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable WebGL and high-performance GPU
    await page.goto('/test-spatial-engine');
    
    // Wait for spatial engine to initialize
    await page.waitForSelector('[data-testid="spatial-engine-loaded"]', {
      timeout: 10000,
    });
  });

  test.describe('Basic Spatial Operations', () => {
    test('should initialize spatial engine with correct viewport', async () => {
      const viewport = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getViewport();
      });

      expect(viewport.zoom).toBe(1);
      expect(viewport.x).toBe(0);
      expect(viewport.y).toBe(0);
    });

    test('should handle zoom operations smoothly', async () => {
      // Test zoom in
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.setViewport({ x: 0, y: 0, zoom: 5, width: 800, height: 600 });
      });

      await page.waitForTimeout(500); // Allow transition to complete

      const viewport = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getViewport();
      });

      expect(viewport.zoom).toBeCloseTo(5, 1);
    });

    test('should maintain 60fps during rapid zoom changes', async () => {
      const frameRates: number[] = [];
      
      await page.evaluate(() => {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const measureFrameRate = () => {
          const now = performance.now();
          const delta = now - lastTime;
          if (delta > 100) { // Measure every 100ms
            const fps = (frameCount * 1000) / delta;
            (window as any).frameRates = (window as any).frameRates || [];
            (window as any).frameRates.push(fps);
            frameCount = 0;
            lastTime = now;
          }
          frameCount++;
          requestAnimationFrame(measureFrameRate);
        };
        
        measureFrameRate();
      });

      // Perform rapid zoom operations
      for (let i = 0; i < 10; i++) {
        const zoom = 0.5 + (i % 5) * 2; // Alternate between 0.5x and 8.5x
        await page.evaluate((zoom) => {
          const engine = (window as any).spatialEngine;
          return engine.setViewport({ x: 0, y: 0, zoom, width: 800, height: 600 }, { duration: 0 });
        }, zoom);
      }

      await page.waitForTimeout(2000);

      const measuredFrameRates = await page.evaluate(() => (window as any).frameRates || []);
      
      // Most frame rates should be above 50fps (allowing some variance)
      const goodFrames = measuredFrameRates.filter((fps: number) => fps > 50).length;
      expect(goodFrames / measuredFrameRates.length).toBeGreaterThan(0.8);
    });
  });

  test.describe('Element Interaction', () => {
    test.beforeEach(async () => {
      // Load test elements
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        const testElements = [];
        
        // Create grid of test elements
        for (let i = 0; i < 100; i++) {
          const row = Math.floor(i / 10);
          const col = i % 10;
          testElements.push({
            id: `element-${i}`,
            type: 'rectangle',
            bounds: {
              x: col * 150,
              y: row * 150,
              width: 100,
              height: 100,
            },
            styles: {
              fill: `hsl(${(i * 36) % 360}, 70%, 50%)`,
            },
            children: [],
          });
        }
        
        return engine.setElements(testElements);
      });
    });

    test('should handle element clicks at different zoom levels', async () => {
      const zoomLevels = [0.5, 1, 2, 5];
      
      for (const zoom of zoomLevels) {
        await page.evaluate((zoom) => {
          const engine = (window as any).spatialEngine;
          return engine.setViewport({ x: 500, y: 500, zoom, width: 800, height: 600 });
        }, zoom);

        await page.waitForTimeout(200);

        // Click on an element
        const clickResult = await page.evaluate(() => {
          const engine = (window as any).spatialEngine;
          // Simulate click at center of viewport (should hit element-55)
          return engine.getElementsAt(500, 500);
        });

        expect(clickResult.length).toBeGreaterThan(0);
        expect(clickResult[0].id).toBe('element-55');
      }
    });

    test('should perform flyTo operations smoothly', async () => {
      const startTime = Date.now();
      
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.flyTo('element-75', { duration: 500 });
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within expected time (with some tolerance)
      expect(duration).toBeGreaterThan(400);
      expect(duration).toBeLessThan(700);

      // Verify final position
      const viewport = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getViewport();
      });

      // Should be centered on element-75 (position 5,7 in grid)
      expect(viewport.x).toBeCloseTo(750, 50); // col 5 * 150 + 50 (center)
      expect(viewport.y).toBeCloseTo(1050, 50); // row 7 * 150 + 50 (center)
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle 10k elements without frame drops', async () => {
      // Load large dataset
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        const elements = [];
        
        for (let i = 0; i < 10000; i++) {
          elements.push({
            id: `perf-element-${i}`,
            type: 'rectangle',
            bounds: {
              x: Math.random() * 10000,
              y: Math.random() * 10000,
              width: 20,
              height: 20,
            },
            styles: {
              fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
            },
            children: [],
          });
        }
        
        return engine.setElements(elements);
      });

      // Measure performance during navigation
      const performanceData = await page.evaluate(async () => {
        const engine = (window as any).spatialEngine;
        const frameTimes: number[] = [];
        
        let frameStart = performance.now();
        const measureFrame = () => {
          const now = performance.now();
          frameTimes.push(now - frameStart);
          frameStart = now;
        };

        // Navigate through different areas
        const navigations = [
          { x: 2500, y: 2500, zoom: 1 },
          { x: 7500, y: 7500, zoom: 2 },
          { x: 1000, y: 8000, zoom: 0.5 },
          { x: 9000, y: 1000, zoom: 3 },
        ];

        for (const nav of navigations) {
          const id = setInterval(measureFrame, 16); // ~60fps
          await engine.setViewport({ ...nav, width: 800, height: 600 }, { duration: 300 });
          await new Promise(resolve => setTimeout(resolve, 400));
          clearInterval(id);
        }

        return {
          averageFrameTime: frameTimes.reduce((a, b) => a + b) / frameTimes.length,
          maxFrameTime: Math.max(...frameTimes),
          frameCount: frameTimes.length,
        };
      });

      expect(performanceData.averageFrameTime).toBeLessThan(20); // < 50fps average
      expect(performanceData.maxFrameTime).toBeLessThan(35); // No frame longer than 35ms
    });

    test('should demonstrate effective viewport culling', async () => {
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        const elements = [];
        
        // Create elements across large area
        for (let i = 0; i < 5000; i++) {
          elements.push({
            id: `cull-element-${i}`,
            type: 'rectangle',
            bounds: {
              x: Math.random() * 50000,
              y: Math.random() * 50000,
              width: 50,
              height: 50,
            },
            styles: {},
            children: [],
          });
        }
        
        return engine.setElements(elements);
      });

      // Focus on small area
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.setViewport({ x: 5000, y: 5000, zoom: 2, width: 800, height: 600 });
      });

      const cullingStats = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getPerformanceStats();
      });

      expect(cullingStats.culling.cullingRatio).toBeGreaterThan(0.8); // > 80% culled
      expect(cullingStats.culling.visibleElements).toBeLessThan(1000); // < 1k visible
    });
  });

  test.describe('Memory Management', () => {
    test('should not leak memory during continuous navigation', async () => {
      // Enable memory measurement
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      if (initialMemory === 0) {
        test.skip('Memory measurement not available in this browser');
        return;
      }

      // Load test elements
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        const elements = [];
        
        for (let i = 0; i < 1000; i++) {
          elements.push({
            id: `memory-element-${i}`,
            type: 'rectangle',
            bounds: {
              x: Math.random() * 10000,
              y: Math.random() * 10000,
              width: 30,
              height: 30,
            },
            styles: {},
            children: [],
          });
        }
        
        return engine.setElements(elements);
      });

      // Perform many navigation operations
      for (let i = 0; i < 50; i++) {
        await page.evaluate(() => {
          const engine = (window as any).spatialEngine;
          return engine.setViewport({
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            zoom: 0.5 + Math.random() * 3,
            width: 800,
            height: 600,
          }, { duration: 0 });
        });
        
        // Trigger GC occasionally
        if (i % 10 === 0) {
          await page.evaluate(() => {
            if ((window as any).gc) {
              (window as any).gc();
            }
          });
        }
      }

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work across different browsers', async () => {
      // Basic functionality test that runs on all browsers
      const browserInfo = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          webgl: !!document.createElement('canvas').getContext('webgl'),
          webgl2: !!document.createElement('canvas').getContext('webgl2'),
        };
      });

      expect(browserInfo.webgl).toBe(true); // WebGL is required

      // Test basic spatial operations
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.setViewport({ x: 100, y: 100, zoom: 2, width: 800, height: 600 });
      });

      const viewport = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getViewport();
      });

      expect(viewport.zoom).toBeCloseTo(2, 1);
      expect(viewport.x).toBeCloseTo(100, 10);
      expect(viewport.y).toBeCloseTo(100, 10);
    });
  });

  test.describe('Touch and Mobile Interactions', () => {
    test('should handle touch gestures on mobile', async ({ browserName }) => {
      if (browserName !== 'Mobile Chrome' && browserName !== 'Mobile Safari') {
        test.skip('Touch tests only run on mobile browsers');
        return;
      }

      // Load test elements
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        const elements = [{
          id: 'touch-target',
          type: 'rectangle',
          bounds: { x: 400, y: 300, width: 200, height: 200 },
          styles: { fill: '#ff0000' },
          children: [],
        }];
        return engine.setElements(elements);
      });

      // Simulate pinch zoom
      await page.touchscreen.tap(500, 400); // Center of element
      
      // Verify touch interaction
      const clickResult = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getElementsAt(500, 400);
      });

      expect(clickResult.length).toBe(1);
      expect(clickResult[0].id).toBe('touch-target');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should gracefully handle invalid viewport values', async () => {
      const result = await page.evaluate(async () => {
        const engine = (window as any).spatialEngine;
        try {
          await engine.setViewport({ x: NaN, y: Infinity, zoom: -1, width: 800, height: 600 });
          return { error: false };
        } catch (e) {
          return { error: true, message: e.message };
        }
      });

      expect(result.error).toBe(true);
      expect(result.message).toContain('Invalid viewport');
    });

    test('should handle rapid viewport changes without breaking', async () => {
      // Spam viewport changes
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const promise = page.evaluate((i) => {
          const engine = (window as any).spatialEngine;
          return engine.setViewport({
            x: i * 100,
            y: i * 100,
            zoom: 1 + i * 0.1,
            width: 800,
            height: 600,
          }, { duration: 50 });
        }, i);
        promises.push(promise);
      }

      // Wait for all to complete
      await Promise.all(promises);

      // Verify engine is still responsive
      const finalViewport = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getViewport();
      });

      expect(typeof finalViewport.x).toBe('number');
      expect(typeof finalViewport.y).toBe('number');
      expect(typeof finalViewport.zoom).toBe('number');
    });
  });
});