/**
 * Performance Benchmarks for Optimization Features
 * Tests and measures the performance gains from all optimizations
 */

import type { SpatialElement, Viewport } from '../types.js';
import type { BoundingBox3D } from '../performance/object-pool-3d.js';

import { OptimizedCullingSystem } from '../performance/optimized-culling-system.js';
import { ViewportCulling3D } from '../performance/viewport-culling-3d.js';
import { getDistanceCache, DistanceCache } from '../performance/distance-cache.js';
import { getPoolManager } from '../performance/object-pool-3d.js';
import { getDOMScheduler } from '../performance/dom-batch-scheduler.js';
import { OptimizedPluginManager } from '../plugin-manager-optimized.js';
import { PluginManager } from '../plugin-manager.js';

interface BenchmarkResult {
  name: string;
  operations: number;
  totalTime: number;
  averageTime: number;
  operationsPerSecond: number;
  memoryUsed: number;
  additionalMetrics?: Record<string, any>;
}

interface ComparisonResult {
  baseline: BenchmarkResult;
  optimized: BenchmarkResult;
  improvement: {
    timeReduction: number; // percentage
    speedIncrease: number; // multiplier
    memoryReduction: number; // percentage
  };
}

export class OptimizationBenchmarks {
  private generateTestElements(count: number): SpatialElement[] {
    const elements: SpatialElement[] = [];
    
    for (let i = 0; i < count; i++) {
      elements.push({
        id: `element-${i}`,
        type: 'rectangle',
        position: { 
          x: Math.random() * 2000 - 1000, 
          y: Math.random() * 2000 - 1000 
        },
        bounds: {
          x: Math.random() * 2000 - 1000,
          y: Math.random() * 2000 - 1000,
          width: Math.random() * 100 + 10,
          height: Math.random() * 100 + 10,
        },
        zPosition: Math.random() * 200 - 100,
        zBounds: {
          near: Math.random() * 200 - 100,
          far: Math.random() * 200 - 50,
        },
      });
    }
    
    return elements;
  }

  private generateTestViewports(count: number): Viewport[] {
    const viewports: Viewport[] = [];
    
    for (let i = 0; i < count; i++) {
      viewports.push({
        x: Math.random() * 1000 - 500,
        y: Math.random() * 1000 - 500,
        z: Math.random() * 100 - 50,
        zoom: Math.random() * 3 + 0.5,
        width: 800,
        height: 600,
      });
    }
    
    return viewports;
  }

  private measureMemory(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private async runBenchmark(
    name: string,
    operation: () => Promise<void> | void,
    iterations: number
  ): Promise<BenchmarkResult> {
    // Warm up
    for (let i = 0; i < 10; i++) {
      await operation();
    }
    
    // Force garbage collection if available
    if (typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
    
    const startMemory = this.measureMemory();
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await operation();
    }
    
    const endTime = performance.now();
    const endMemory = this.measureMemory();
    
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;
    const operationsPerSecond = 1000 / averageTime;
    const memoryUsed = Math.max(0, endMemory - startMemory);
    
    return {
      name,
      operations: iterations,
      totalTime,
      averageTime,
      operationsPerSecond,
      memoryUsed,
    };
  }

  /**
   * Benchmark 1: Object Pooling vs Regular Object Creation
   */
  async benchmarkObjectPooling(): Promise<ComparisonResult> {
    const iterations = 10000;
    
    // Baseline: Regular object creation
    const baseline = await this.runBenchmark(
      'Regular Object Creation',
      () => {
        const bounds: BoundingBox3D[] = [];
        for (let i = 0; i < 100; i++) {
          bounds.push({
            x: i, y: i, width: 10, height: 10, zMin: 0, zMax: 1
          });
        }
        // Let objects be garbage collected naturally
      },
      iterations
    );

    // Optimized: Object pooling
    const poolManager = getPoolManager();
    const optimized = await this.runBenchmark(
      'Object Pooling',
      () => {
        const boundsPool = poolManager.getBoundingBox3DPool();
        const bounds: BoundingBox3D[] = [];
        
        for (let i = 0; i < 100; i++) {
          const bound = boundsPool.acquire();
          boundsPool.setBounds(bound, i, i, 10, 10, 0, 1);
          bounds.push(bound);
        }
        
        // Release back to pool
        for (const bound of bounds) {
          boundsPool.release(bound);
        }
      },
      iterations
    );

    return {
      baseline,
      optimized,
      improvement: {
        timeReduction: ((baseline.averageTime - optimized.averageTime) / baseline.averageTime) * 100,
        speedIncrease: baseline.averageTime / optimized.averageTime,
        memoryReduction: ((baseline.memoryUsed - optimized.memoryUsed) / baseline.memoryUsed) * 100,
      }
    };
  }

  /**
   * Benchmark 2: Distance Caching vs Recalculation
   */
  async benchmarkDistanceCaching(): Promise<ComparisonResult> {
    const elements = this.generateTestElements(1000);
    const viewports = this.generateTestViewports(100);
    const iterations = 50;

    // Baseline: Always recalculate distances
    const baseline = await this.runBenchmark(
      'Distance Recalculation',
      () => {
        for (const viewport of viewports) {
          for (const element of elements) {
            const dx = element.position.x - viewport.x;
            const dy = element.position.y - viewport.y;
            const dz = (element.zPosition || 0) - (viewport.z || 0);
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          }
        }
      },
      iterations
    );

    // Optimized: Use distance caching
    const distanceCache = new DistanceCache();
    const optimized = await this.runBenchmark(
      'Distance Caching',
      () => {
        for (const viewport of viewports) {
          for (const element of elements) {
            const bounds3D = {
              x: element.bounds.x,
              y: element.bounds.y,
              width: element.bounds.width,
              height: element.bounds.height,
              zMin: element.zBounds?.near || 0,
              zMax: element.zBounds?.far || 1,
            };
            
            const distance = distanceCache.getDistance(
              element.id, bounds3D, viewport.x, viewport.y, viewport.z || 0
            );
          }
        }
      },
      iterations
    );

    distanceCache.destroy();

    return {
      baseline,
      optimized,
      improvement: {
        timeReduction: ((baseline.averageTime - optimized.averageTime) / baseline.averageTime) * 100,
        speedIncrease: baseline.averageTime / optimized.averageTime,
        memoryReduction: ((baseline.memoryUsed - optimized.memoryUsed) / baseline.memoryUsed) * 100,
      }
    };
  }

  /**
   * Benchmark 3: DOM Batching vs Individual Updates
   */
  async benchmarkDOMBatching(): Promise<ComparisonResult> {
    const iterations = 100;
    const elementsPerIteration = 50;

    // Create DOM elements for testing
    const testElements: HTMLElement[] = [];
    for (let i = 0; i < elementsPerIteration; i++) {
      const div = document.createElement('div');
      div.textContent = 'Test';
      document.body.appendChild(div);
      testElements.push(div);
    }

    // Baseline: Individual DOM updates
    const baseline = await this.runBenchmark(
      'Individual DOM Updates',
      () => {
        testElements.forEach((el, i) => {
          el.textContent = `Updated ${i}`;
          el.style.left = `${i * 10}px`;
          el.style.backgroundColor = i % 2 ? 'red' : 'blue';
        });
      },
      iterations
    );

    // Optimized: Batched DOM updates
    const scheduler = getDOMScheduler();
    const optimized = await this.runBenchmark(
      'Batched DOM Updates',
      async () => {
        testElements.forEach((el, i) => {
          scheduler.schedule(() => {
            el.textContent = `Updated ${i}`;
          }, 0, `text-${i}`);
          
          scheduler.schedule(() => {
            el.style.left = `${i * 10}px`;
          }, 0, `left-${i}`);
          
          scheduler.schedule(() => {
            el.style.backgroundColor = i % 2 ? 'red' : 'blue';
          }, 0, `bg-${i}`);
        });
        
        // Wait for batch to complete
        await new Promise(resolve => requestAnimationFrame(resolve));
      },
      iterations
    );

    // Cleanup
    testElements.forEach(el => el.remove());

    return {
      baseline,
      optimized,
      improvement: {
        timeReduction: ((baseline.averageTime - optimized.averageTime) / baseline.averageTime) * 100,
        speedIncrease: baseline.averageTime / optimized.averageTime,
        memoryReduction: ((baseline.memoryUsed - optimized.memoryUsed) / baseline.memoryUsed) * 100,
      }
    };
  }

  /**
   * Benchmark 4: Optimized Plugin System vs Original
   */
  async benchmarkPluginSystem(): Promise<ComparisonResult> {
    const elements = this.generateTestElements(1000);
    const viewport: Viewport = { x: 0, y: 0, z: 0, zoom: 1, width: 800, height: 600 };
    const context = { viewport, timestamp: Date.now(), frameRate: 60 };
    const iterations = 100;

    // Create test behavior
    const testBehavior = {
      id: 'test-behavior',
      name: 'Test Behavior',
      apply: (elements: any[]) => elements.filter(e => e.position.x > -500),
      shouldApply: () => true,
    };

    // Baseline: Original plugin system
    const originalManager = new PluginManager();
    originalManager.initialize();
    originalManager.registerBehavior(testBehavior);

    const baseline = await this.runBenchmark(
      'Original Plugin System',
      () => {
        originalManager.applyBehaviors(elements, context);
      },
      iterations
    );

    // Optimized: New plugin system
    const optimizedManager = new OptimizedPluginManager();
    optimizedManager.initialize();
    optimizedManager.registerBehavior(testBehavior);

    const optimized = await this.runBenchmark(
      'Optimized Plugin System',
      () => {
        optimizedManager.applyBehaviors(elements, context);
      },
      iterations
    );

    // Cleanup
    await originalManager.destroy();
    await optimizedManager.destroy();

    return {
      baseline,
      optimized,
      improvement: {
        timeReduction: ((baseline.averageTime - optimized.averageTime) / baseline.averageTime) * 100,
        speedIncrease: baseline.averageTime / optimized.averageTime,
        memoryReduction: ((baseline.memoryUsed - optimized.memoryUsed) / baseline.memoryUsed) * 100,
      }
    };
  }

  /**
   * Benchmark 5: 3D Culling System Performance
   */
  async benchmark3DCulling(): Promise<ComparisonResult> {
    const elements = this.generateTestElements(5000);
    const viewport: Viewport = { x: 0, y: 0, z: 0, zoom: 1, width: 800, height: 600 };
    const iterations = 50;

    // Baseline: Original 3D culling
    const originalCuller = new ViewportCulling3D();
    const baseline = await this.runBenchmark(
      'Original 3D Culling',
      () => {
        originalCuller.cullElements(elements, viewport);
      },
      iterations
    );

    // Optimized: New culling system
    const optimizedCuller = new OptimizedCullingSystem({
      enableWorkers: false, // Disable workers for fair comparison
      enableOctree: true,
      enableDistanceCache: true,
    });

    // Initialize with world bounds
    optimizedCuller.initializeSpatialIndex({
      x: -1000, y: -1000, width: 2000, height: 2000, zMin: -100, zMax: 100
    });
    optimizedCuller.updateSpatialIndex(elements);

    const optimized = await this.runBenchmark(
      'Optimized 3D Culling',
      async () => {
        await optimizedCuller.cullElements(elements, viewport);
      },
      iterations
    );

    // Cleanup
    optimizedCuller.destroy();

    return {
      baseline,
      optimized,
      improvement: {
        timeReduction: ((baseline.averageTime - optimized.averageTime) / baseline.averageTime) * 100,
        speedIncrease: baseline.averageTime / optimized.averageTime,
        memoryReduction: ((baseline.memoryUsed - optimized.memoryUsed) / baseline.memoryUsed) * 100,
      }
    };
  }

  /**
   * Run all benchmarks and generate report
   */
  async runAllBenchmarks(): Promise<{
    results: Record<string, ComparisonResult>;
    summary: {
      averageTimeImprovement: number;
      averageSpeedIncrease: number;
      averageMemoryReduction: number;
      totalBenchmarks: number;
    };
  }> {
    console.log('🚀 Running optimization benchmarks...');
    
    const results: Record<string, ComparisonResult> = {};
    
    console.log('📊 Testing object pooling...');
    results.objectPooling = await this.benchmarkObjectPooling();
    
    console.log('📊 Testing distance caching...');
    results.distanceCaching = await this.benchmarkDistanceCaching();
    
    console.log('📊 Testing DOM batching...');
    results.domBatching = await this.benchmarkDOMBatching();
    
    console.log('📊 Testing plugin system...');
    results.pluginSystem = await this.benchmarkPluginSystem();
    
    console.log('📊 Testing 3D culling...');
    results.culling3D = await this.benchmark3DCulling();
    
    // Calculate summary statistics
    const improvements = Object.values(results);
    const averageTimeImprovement = improvements.reduce((sum, r) => sum + r.improvement.timeReduction, 0) / improvements.length;
    const averageSpeedIncrease = improvements.reduce((sum, r) => sum + r.improvement.speedIncrease, 0) / improvements.length;
    const averageMemoryReduction = improvements.reduce((sum, r) => sum + r.improvement.memoryReduction, 0) / improvements.length;
    
    return {
      results,
      summary: {
        averageTimeImprovement,
        averageSpeedIncrease,
        averageMemoryReduction,
        totalBenchmarks: improvements.length,
      }
    };
  }

  /**
   * Generate a formatted report
   */
  generateReport(benchmarkResults: Awaited<ReturnType<typeof this.runAllBenchmarks>>): string {
    const { results, summary } = benchmarkResults;
    
    let report = '\n🏆 OPTIMIZATION BENCHMARK RESULTS\n';
    report += '='.repeat(50) + '\n\n';
    
    Object.entries(results).forEach(([name, result]) => {
      report += `📈 ${name.toUpperCase().replace(/([A-Z])/g, ' $1').trim()}\n`;
      report += `-`.repeat(30) + '\n';
      report += `  Baseline:  ${result.baseline.averageTime.toFixed(2)}ms avg, ${result.baseline.operationsPerSecond.toFixed(0)} ops/sec\n`;
      report += `  Optimized: ${result.optimized.averageTime.toFixed(2)}ms avg, ${result.optimized.operationsPerSecond.toFixed(0)} ops/sec\n`;
      report += `  ⚡ Speed increase: ${result.improvement.speedIncrease.toFixed(2)}x\n`;
      report += `  ⏱️  Time reduction: ${result.improvement.timeReduction.toFixed(1)}%\n`;
      report += `  💾 Memory reduction: ${result.improvement.memoryReduction.toFixed(1)}%\n\n`;
    });
    
    report += '🎯 OVERALL SUMMARY\n';
    report += '-'.repeat(20) + '\n';
    report += `  Average speed increase: ${summary.averageSpeedIncrease.toFixed(2)}x\n`;
    report += `  Average time reduction: ${summary.averageTimeImprovement.toFixed(1)}%\n`;
    report += `  Average memory reduction: ${summary.averageMemoryReduction.toFixed(1)}%\n`;
    report += `  Total benchmarks: ${summary.totalBenchmarks}\n\n`;
    
    const overallRating = summary.averageSpeedIncrease > 2 ? '🔥 EXCELLENT' : 
                         summary.averageSpeedIncrease > 1.5 ? '✅ GOOD' : '⚠️  NEEDS WORK';
    
    report += `Overall performance rating: ${overallRating}\n`;
    
    return report;
  }
}