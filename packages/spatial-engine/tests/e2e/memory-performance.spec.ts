import { test, expect } from '@playwright/test';

test.describe('Memory and Performance E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-spatial-engine');
    await page.waitForSelector('[data-testid="spatial-engine-loaded"]');
  });

  test('should not have memory leaks during continuous navigation', async ({ page }) => {
    // Skip if memory API is not available
    const hasMemoryAPI = await page.evaluate(() => {
      return !!(performance as any).memory;
    });

    if (!hasMemoryAPI) {
      test.skip('Memory API not available in this browser');
      return;
    }

    // Start memory monitoring
    await page.evaluate(() => {
      (window as any).memorySnapshots = [];
      (window as any).startMemoryMonitoring = () => {
        const takeSnapshot = () => {
          const memory = (performance as any).memory;
          (window as any).memorySnapshots.push({
            timestamp: performance.now(),
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
          });
        };
        
        takeSnapshot(); // Initial snapshot
        return setInterval(takeSnapshot, 500);
      };
    });

    const monitoringId = await page.evaluate(() => {
      return (window as any).startMemoryMonitoring();
    });

    // Load test elements
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      for (let i = 0; i < 5000; i++) {
        elements.push({
          id: `memory-test-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 20000,
            y: Math.random() * 20000,
            width: 50,
            height: 50,
          },
          styles: {
            fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
          },
          children: [],
        });
      }
      
      return engine.setElements(elements);
    });

    // Perform intensive navigation for 30 seconds
    const navigationEndTime = Date.now() + 30000;
    let navigationCount = 0;

    while (Date.now() < navigationEndTime) {
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.setViewport({
          x: Math.random() * 20000,
          y: Math.random() * 20000,
          zoom: 0.5 + Math.random() * 4,
          width: 800,
          height: 600,
        }, { duration: 0 });
      });
      
      navigationCount++;
      
      // Force GC every 10 navigations
      if (navigationCount % 10 === 0) {
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
      }
      
      await page.waitForTimeout(100);
    }

    // Stop monitoring and get results
    const memoryAnalysis = await page.evaluate((monitoringId) => {
      clearInterval(monitoringId);
      
      const snapshots = (window as any).memorySnapshots;
      if (snapshots.length < 10) {
        return { insufficient: true };
      }
      
      // Calculate memory growth over time
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];
      const timeSpan = last.timestamp - first.timestamp;
      const memoryGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
      const growthRate = (memoryGrowth / timeSpan) * 1000; // bytes per second
      
      // Calculate maximum memory increase from any point
      let maxIncrease = 0;
      let maxMemory = first.usedJSHeapSize;
      
      for (const snapshot of snapshots) {
        if (snapshot.usedJSHeapSize > maxMemory) {
          maxMemory = snapshot.usedJSHeapSize;
        }
        const increase = snapshot.usedJSHeapSize - first.usedJSHeapSize;
        if (increase > maxIncrease) {
          maxIncrease = increase;
        }
      }
      
      return {
        snapshots: snapshots.length,
        initialMemory: first.usedJSHeapSize,
        finalMemory: last.usedJSHeapSize,
        growthRate,
        maxIncrease,
        navigationCount: snapshots.length - 1, // Approximate
      };
    }, monitoringId);

    if (memoryAnalysis.insufficient) {
      console.log('Insufficient memory snapshots for analysis');
      return;
    }

    console.log('Memory Analysis:', memoryAnalysis);

    // Memory should not grow significantly over time
    const growthRateMB = memoryAnalysis.growthRate / (1024 * 1024);
    expect(growthRateMB).toBeLessThan(1); // Less than 1MB/s growth

    // Max memory increase should be reasonable
    const maxIncreaseMB = memoryAnalysis.maxIncrease / (1024 * 1024);
    expect(maxIncreaseMB).toBeLessThan(100); // Less than 100MB total increase
  });

  test('should handle large datasets without excessive memory usage', async ({ page }) => {
    const hasMemoryAPI = await page.evaluate(() => {
      return !!(performance as any).memory;
    });

    if (!hasMemoryAPI) {
      test.skip('Memory API not available in this browser');
      return;
    }

    // Take baseline memory measurement
    const baselineMemory = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    });

    // Load 50k elements
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      for (let i = 0; i < 50000; i++) {
        elements.push({
          id: `large-dataset-${i}`,
          type: 'rectangle',
          bounds: {
            x: (i % 1000) * 25,
            y: Math.floor(i / 1000) * 25,
            width: 20,
            height: 20,
          },
          styles: {
            fill: `hsl(${(i * 7) % 360}, 70%, 50%)`,
          },
          children: [],
        });
      }
      
      return engine.setElements(elements);
    });

    // Force garbage collection and measure memory usage
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(1000); // Allow GC to complete

    const memoryAfterLoad = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    });

    const memoryIncrease = memoryAfterLoad - baselineMemory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    console.log(`Memory increase for 50k elements: ${memoryIncreaseMB.toFixed(2)}MB`);

    // Should use less than 200MB for 50k simple elements
    expect(memoryIncreaseMB).toBeLessThan(200);

    // Test navigation performance with large dataset
    const navigationStart = performance.now();
    
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.flyTo({ x: 12500, y: 6250, width: 2000, height: 2000 });
    });

    const navigationTime = performance.now() - navigationStart;
    
    // Navigation should complete in reasonable time even with large dataset
    expect(navigationTime).toBeLessThan(2000); // Less than 2 seconds
  });

  test('should efficiently handle rapid element updates', async ({ page }) => {
    // Load initial dataset
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      for (let i = 0; i < 1000; i++) {
        elements.push({
          id: `update-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: (i % 50) * 30,
            y: Math.floor(i / 50) * 30,
            width: 25,
            height: 25,
          },
          styles: {
            fill: '#ff0000',
          },
          children: [],
        });
      }
      
      return engine.setElements(elements);
    });

    // Perform rapid updates
    const updateTimes = [];
    
    for (let update = 0; update < 20; update++) {
      const updateStart = performance.now();
      
      await page.evaluate((update) => {
        const engine = (window as any).spatialEngine;
        const elements = engine.getElements().map((element: any, index: number) => ({
          ...element,
          bounds: {
            ...element.bounds,
            x: element.bounds.x + (update % 2 === 0 ? 5 : -5),
          },
          styles: {
            fill: `hsl(${(update * 18 + index) % 360}, 70%, 50%)`,
          },
        }));
        
        return engine.setElements(elements);
      }, update);
      
      const updateTime = performance.now() - updateStart;
      updateTimes.push(updateTime);
      
      await page.waitForTimeout(50);
    }

    // Calculate average update time
    const averageUpdateTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length;
    const maxUpdateTime = Math.max(...updateTimes);

    console.log(`Average update time: ${averageUpdateTime.toFixed(2)}ms`);
    console.log(`Max update time: ${maxUpdateTime.toFixed(2)}ms`);

    // Updates should be fast
    expect(averageUpdateTime).toBeLessThan(100); // Less than 100ms average
    expect(maxUpdateTime).toBeLessThan(300); // Less than 300ms max
  });

  test('should maintain performance during stress testing', async ({ page }) => {
    // Start performance monitoring
    const performanceData = await page.evaluate(() => {
      const metrics = {
        frameTimes: [] as number[],
        memorySnapshots: [] as number[],
        renderCounts: [] as number[],
      };

      let lastTime = performance.now();
      let frameCount = 0;

      const measurePerformance = () => {
        const now = performance.now();
        const frameTime = now - lastTime;
        lastTime = now;

        if (frameTime < 100) { // Ignore long pauses
          metrics.frameTimes.push(frameTime);
        }

        const memory = (performance as any).memory;
        if (memory) {
          metrics.memorySnapshots.push(memory.usedJSHeapSize);
        }

        frameCount++;
        if (frameCount % 60 === 0) { // Every ~1 second
          const stats = (window as any).spatialEngine?.getPerformanceStats();
          if (stats) {
            metrics.renderCounts.push(stats.culling?.visibleElements || 0);
          }
        }

        if (metrics.frameTimes.length < 1000) {
          requestAnimationFrame(measurePerformance);
        }
      };

      requestAnimationFrame(measurePerformance);
      return metrics;
    });

    // Load stress test elements
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      // Create 20k elements with varying sizes and positions
      for (let i = 0; i < 20000; i++) {
        const size = 5 + Math.random() * 45;
        elements.push({
          id: `stress-element-${i}`,
          type: Math.random() > 0.5 ? 'rectangle' : 'circle',
          bounds: {
            x: Math.random() * 50000,
            y: Math.random() * 50000,
            width: size,
            height: size,
          },
          styles: {
            fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
            opacity: 0.3 + Math.random() * 0.7,
          },
          children: [],
        });
      }
      
      return engine.setElements(elements);
    });

    // Perform stress test navigation
    const stressDuration = 15000; // 15 seconds
    const stressEndTime = Date.now() + stressDuration;
    
    while (Date.now() < stressEndTime) {
      // Rapid zoom and pan operations
      await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        const promises = [];
        
        for (let i = 0; i < 3; i++) {
          promises.push(engine.setViewport({
            x: Math.random() * 50000,
            y: Math.random() * 50000,
            zoom: 0.1 + Math.random() * 9.9,
            width: 800,
            height: 600,
          }, { duration: 0 }));
        }
        
        return Promise.all(promises);
      });
      
      await page.waitForTimeout(100);
    }

    // Collect final performance metrics
    const finalMetrics = await page.evaluate(() => {
      return (window as any).performanceMetrics;
    });

    // Wait for performance data collection to complete
    await page.waitForTimeout(2000);

    const results = await page.evaluate(() => {
      const metrics = (window as any).performanceMetrics;
      
      if (!metrics || metrics.frameTimes.length === 0) {
        return { insufficient: true };
      }

      const avgFrameTime = metrics.frameTimes.reduce((a: number, b: number) => a + b) / metrics.frameTimes.length;
      const maxFrameTime = Math.max(...metrics.frameTimes);
      const fps = 1000 / avgFrameTime;
      
      const framesOver33ms = metrics.frameTimes.filter((t: number) => t > 33.33).length;
      const dropRate = framesOver33ms / metrics.frameTimes.length;

      return {
        avgFrameTime,
        maxFrameTime,
        fps,
        dropRate,
        totalFrames: metrics.frameTimes.length,
        memorySnapshots: metrics.memorySnapshots.length,
      };
    });

    if (results.insufficient) {
      console.log('Insufficient performance data collected');
      return;
    }

    console.log('Stress Test Results:', results);

    // Performance should remain reasonable under stress
    expect(results.fps).toBeGreaterThan(30); // At least 30 FPS average
    expect(results.maxFrameTime).toBeLessThan(100); // No frame longer than 100ms
    expect(results.dropRate).toBeLessThan(0.2); // Less than 20% dropped frames
  });

  test('should handle viewport culling efficiently', async ({ page }) => {
    // Load large distributed dataset
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      // Create 100k elements across a huge area
      for (let i = 0; i < 100000; i++) {
        elements.push({
          id: `culling-element-${i}`,
          type: 'rectangle',
          bounds: {
            x: Math.random() * 500000,
            y: Math.random() * 500000,
            width: 10,
            height: 10,
          },
          styles: {
            fill: `hsl(${(i * 3.6) % 360}, 70%, 50%)`,
          },
          children: [],
        });
      }
      
      return engine.setElements(elements);
    });

    // Test culling at different zoom levels
    const zoomLevels = [0.001, 0.01, 0.1, 1, 10, 100];
    
    for (const zoom of zoomLevels) {
      const cullingStart = performance.now();
      
      await page.evaluate((zoom) => {
        const engine = (window as any).spatialEngine;
        return engine.setViewport({
          x: 250000, // Center of the huge area
          y: 250000,
          zoom,
          width: 800,
          height: 600,
        });
      }, zoom);

      await page.waitForTimeout(200); // Allow rendering to complete

      const cullingStats = await page.evaluate(() => {
        const engine = (window as any).spatialEngine;
        return engine.getPerformanceStats();
      });

      const cullingTime = performance.now() - cullingStart;

      console.log(`Zoom ${zoom}: ${cullingStats.culling.visibleElements} visible, ${cullingStats.culling.cullingRatio.toFixed(3)} culled, ${cullingTime.toFixed(1)}ms`);

      // Culling should be effective
      expect(cullingStats.culling.cullingRatio).toBeGreaterThan(0.5); // At least 50% culled
      expect(cullingStats.culling.visibleElements).toBeLessThan(50000); // Not rendering everything
      
      // Culling should be fast
      expect(cullingTime).toBeLessThan(1000); // Less than 1 second
    }
  });
});