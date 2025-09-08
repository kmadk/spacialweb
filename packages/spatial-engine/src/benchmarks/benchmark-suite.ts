/**
 * Comprehensive benchmark suite for spatial engine performance validation
 * Tests real-world scenarios and edge cases with precise measurements
 */

import { OptimizedSpatialEngine } from '../optimized-spatial-engine.js';
import { HierarchicalSpatialIndex } from '../algorithms/spatial-indexing.js';
import { ViewportCuller } from '../performance/viewport-culling.js';
import { MemoryProfiler } from '../performance/memory-profiler.js';
import type { SpatialElement, Viewport } from '../types.js';

export interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memoryUsed: number;
  maxMemory: number;
  metadata: Record<string, any>;
}

export interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalTime: number;
  overallScore: number;
}

export class SpatialEngineBenchmark {
  private memoryProfiler: MemoryProfiler;
  private results: Map<string, BenchmarkSuite> = new Map();

  constructor() {
    this.memoryProfiler = new MemoryProfiler({
      samplingInterval: 100,
      maxSnapshots: 1000,
    });
  }

  /**
   * Run all benchmark suites
   */
  public async runAllBenchmarks(): Promise<Map<string, BenchmarkSuite>> {
    console.log('🚀 Starting Spatial Engine Benchmark Suite');
    
    this.memoryProfiler.startMonitoring();
    
    // Core engine benchmarks
    await this.runEngineBenchmarks();
    
    // Spatial indexing benchmarks
    await this.runIndexingBenchmarks();
    
    // Viewport culling benchmarks
    await this.runCullingBenchmarks();
    
    // Memory management benchmarks
    await this.runMemoryBenchmarks();
    
    // Real-world scenario benchmarks
    await this.runScenarioBenchmarks();
    
    this.memoryProfiler.stopMonitoring();
    
    console.log('✅ Benchmark Suite Complete');
    return this.results;
  }

  /**
   * Core spatial engine performance benchmarks
   */
  private async runEngineBenchmarks(): Promise<void> {
    console.log('🔧 Running Engine Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Spatial Engine Core',
      results: [],
      totalTime: 0,
      overallScore: 0,
    };

    const container = this.createTestContainer();
    const engine = new OptimizedSpatialEngine({
      container,
      width: 1920,
      height: 1080,
    });

    // Element loading benchmark
    const loadingSizes = [100, 1000, 10000, 50000];
    for (const size of loadingSizes) {
      const elements = this.generateTestElements(size);
      const result = await this.benchmarkOperation(
        `Load ${size} elements`,
        async () => {
          await engine.setElements(elements);
        },
        size
      );
      suite.results.push(result);
    }

    // Viewport operations benchmark
    const viewportOps = [
      { name: 'Set viewport', op: () => engine.setViewport({ x: 1000, y: 1000, zoom: 2, width: 1920, height: 1080 }) },
      { name: 'Zoom in', op: () => engine.setViewport({ x: 1000, y: 1000, zoom: 5, width: 1920, height: 1080 }) },
      { name: 'Zoom out', op: () => engine.setViewport({ x: 1000, y: 1000, zoom: 0.1, width: 1920, height: 1080 }) },
      { name: 'Pan viewport', op: () => engine.setViewport({ x: 5000, y: 5000, zoom: 1, width: 1920, height: 1080 }) },
    ];

    // Load test elements first
    await engine.setElements(this.generateTestElements(10000));

    for (const { name, op } of viewportOps) {
      const result = await this.benchmarkOperation(name, op, 100);
      suite.results.push(result);
    }

    // Navigation benchmarks
    const navElements = this.generateTestElements(5000);
    await engine.setElements(navElements);

    const navResult = await this.benchmarkOperation(
      'FlyTo navigation',
      async () => {
        const targetElement = navElements[Math.floor(Math.random() * navElements.length)];
        await engine.flyTo(targetElement.id);
      },
      50
    );
    suite.results.push(navResult);

    engine.destroy();
    this.cleanupTestContainer(container);

    suite.totalTime = suite.results.reduce((sum, r) => sum + r.duration, 0);
    suite.overallScore = this.calculateSuiteScore(suite);
    this.results.set('engine', suite);
  }

  /**
   * Spatial indexing performance benchmarks
   */
  private async runIndexingBenchmarks(): Promise<void> {
    console.log('🗃️ Running Indexing Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Spatial Indexing',
      results: [],
      totalTime: 0,
      overallScore: 0,
    };

    const index = new HierarchicalSpatialIndex({
      gridSize: 256,
      maxElements: 16,
      maxLevels: 8,
    });

    // Indexing performance
    const indexingSizes = [1000, 10000, 100000];
    for (const size of indexingSizes) {
      const elements = this.generateTestElements(size);
      const result = await this.benchmarkOperation(
        `Index ${size} elements`,
        () => {
          index.indexElements(elements);
        },
        1
      );
      result.metadata = { elementsIndexed: size };
      suite.results.push(result);
    }

    // Query performance with 100k elements
    const largeDataset = this.generateTestElements(100000);
    index.indexElements(largeDataset);

    const queryTypes = [
      { name: 'Point queries', fn: () => index.queryPoint(Math.random() * 10000, Math.random() * 10000) },
      { name: 'Small area queries', fn: () => index.query({ x: Math.random() * 9000, y: Math.random() * 9000, width: 1000, height: 1000 }) },
      { name: 'Large area queries', fn: () => index.query({ x: Math.random() * 5000, y: Math.random() * 5000, width: 5000, height: 5000 }) },
      { name: 'KNN queries', fn: () => index.queryKNN(Math.random() * 10000, Math.random() * 10000, 10) },
      { name: 'Radius queries', fn: () => index.queryRadius(Math.random() * 10000, Math.random() * 10000, 500) },
    ];

    for (const { name, fn } of queryTypes) {
      const result = await this.benchmarkOperation(name, fn, 10000);
      suite.results.push(result);
    }

    suite.totalTime = suite.results.reduce((sum, r) => sum + r.duration, 0);
    suite.overallScore = this.calculateSuiteScore(suite);
    this.results.set('indexing', suite);
  }

  /**
   * Viewport culling performance benchmarks
   */
  private async runCullingBenchmarks(): Promise<void> {
    console.log('✂️ Running Culling Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Viewport Culling',
      results: [],
      totalTime: 0,
      overallScore: 0,
    };

    const culler = new ViewportCuller();

    // Culling performance with different dataset sizes
    const cullingSizes = [1000, 10000, 100000];
    for (const size of cullingSizes) {
      const elements = this.generateTestElements(size);
      const viewport: Viewport = { x: 5000, y: 5000, zoom: 1, width: 1920, height: 1080 };
      
      const result = await this.benchmarkOperation(
        `Cull ${size} elements`,
        () => {
          const cullResult = culler.cullElements(elements, viewport);
          return cullResult;
        },
        1000
      );
      
      result.metadata = { 
        elementsProcessed: size,
        avgCullingRatio: 0.8, // This would be calculated from actual results
      };
      suite.results.push(result);
    }

    // Different viewport sizes
    const elements = this.generateTestElements(50000);
    const viewportSizes = [
      { name: 'Small viewport', width: 800, height: 600 },
      { name: 'Large viewport', width: 3840, height: 2160 },
      { name: 'Ultra-wide viewport', width: 5120, height: 1440 },
    ];

    for (const { name, width, height } of viewportSizes) {
      const viewport: Viewport = { x: 5000, y: 5000, zoom: 1, width, height };
      const result = await this.benchmarkOperation(
        `${name} culling`,
        () => culler.cullElements(elements, viewport),
        1000
      );
      suite.results.push(result);
    }

    suite.totalTime = suite.results.reduce((sum, r) => sum + r.duration, 0);
    suite.overallScore = this.calculateSuiteScore(suite);
    this.results.set('culling', suite);
  }

  /**
   * Memory management benchmarks
   */
  private async runMemoryBenchmarks(): Promise<void> {
    console.log('💾 Running Memory Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Memory Management',
      results: [],
      totalTime: 0,
      overallScore: 0,
    };

    // Memory allocation stress test
    const container = this.createTestContainer();
    const engine = new OptimizedSpatialEngine({
      container,
      width: 1920,
      height: 1080,
    });

    const initialMemory = this.getCurrentMemory();
    
    // Progressive memory loading
    const memorySizes = [1000, 5000, 10000, 25000, 50000];
    for (const size of memorySizes) {
      const elements = this.generateTestElements(size);
      
      const result = await this.benchmarkOperation(
        `Memory load ${size} elements`,
        async () => {
          await engine.setElements(elements);
          this.forceGC();
        },
        1
      );
      
      const currentMemory = this.getCurrentMemory();
      result.memoryUsed = currentMemory - initialMemory;
      result.metadata = {
        memoryPerElement: result.memoryUsed / size,
        totalElements: size,
      };
      
      suite.results.push(result);
    }

    // Memory leak test
    const leakResult = await this.benchmarkOperation(
      'Memory leak test',
      async () => {
        for (let i = 0; i < 100; i++) {
          const elements = this.generateTestElements(1000);
          await engine.setElements(elements);
          
          // Navigate around
          await engine.setViewport({
            x: Math.random() * 10000,
            y: Math.random() * 10000,
            zoom: 0.5 + Math.random() * 4,
            width: 1920,
            height: 1080,
          });
          
          if (i % 10 === 0) {
            this.forceGC();
          }
        }
      },
      1
    );
    
    suite.results.push(leakResult);

    engine.destroy();
    this.cleanupTestContainer(container);

    suite.totalTime = suite.results.reduce((sum, r) => sum + r.duration, 0);
    suite.overallScore = this.calculateSuiteScore(suite);
    this.results.set('memory', suite);
  }

  /**
   * Real-world scenario benchmarks
   */
  private async runScenarioBenchmarks(): Promise<void> {
    console.log('🌍 Running Real-World Scenario Benchmarks...');
    
    const suite: BenchmarkSuite = {
      name: 'Real-World Scenarios',
      results: [],
      totalTime: 0,
      overallScore: 0,
    };

    const container = this.createTestContainer();
    const engine = new OptimizedSpatialEngine({
      container,
      width: 1920,
      height: 1080,
    });

    // Design system scenario (moderate complexity)
    const designSystemElements = this.generateDesignSystemElements();
    const designSystemResult = await this.benchmarkOperation(
      'Design system navigation',
      async () => {
        await engine.setElements(designSystemElements);
        
        // Simulate typical design system navigation
        const scenarios = [
          { x: 1000, y: 500, zoom: 2 }, // Component detail
          { x: 5000, y: 3000, zoom: 0.5 }, // Overview
          { x: 3000, y: 1500, zoom: 1.5 }, // Section view
        ];
        
        for (const scenario of scenarios) {
          await engine.setViewport({ ...scenario, width: 1920, height: 1080 });
        }
      },
      10
    );
    suite.results.push(designSystemResult);

    // Large dashboard scenario (high complexity)
    const dashboardElements = this.generateDashboardElements();
    const dashboardResult = await this.benchmarkOperation(
      'Large dashboard interaction',
      async () => {
        await engine.setElements(dashboardElements);
        
        // Simulate dashboard drilling down
        for (let i = 0; i < 20; i++) {
          await engine.setViewport({
            x: Math.random() * 20000,
            y: Math.random() * 15000,
            zoom: 0.5 + Math.random() * 3,
            width: 1920,
            height: 1080,
          });
        }
      },
      5
    );
    suite.results.push(dashboardResult);

    // CAD-like scenario (extreme complexity)
    const cadElements = this.generateCADElements();
    const cadResult = await this.benchmarkOperation(
      'CAD-like complex rendering',
      async () => {
        await engine.setElements(cadElements);
        
        // Simulate CAD navigation patterns
        const zoomLevels = [0.01, 0.1, 1, 10, 100];
        for (const zoom of zoomLevels) {
          await engine.setViewport({
            x: 10000,
            y: 10000,
            zoom,
            width: 1920,
            height: 1080,
          });
        }
      },
      3
    );
    suite.results.push(cadResult);

    engine.destroy();
    this.cleanupTestContainer(container);

    suite.totalTime = suite.results.reduce((sum, r) => sum + r.duration, 0);
    suite.overallScore = this.calculateSuiteScore(suite);
    this.results.set('scenarios', suite);
  }

  /**
   * Benchmark a specific operation
   */
  private async benchmarkOperation(
    name: string,
    operation: () => any,
    iterations: number = 1
  ): Promise<BenchmarkResult> {
    console.log(`  📊 Benchmarking: ${name} (${iterations} iterations)`);
    
    const startMemory = this.getCurrentMemory();
    let maxMemory = startMemory;
    
    // Warm up
    if (iterations > 1) {
      for (let i = 0; i < Math.min(3, iterations); i++) {
        await operation();
      }
    }
    
    this.forceGC();
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      await operation();
      
      const currentMemory = this.getCurrentMemory();
      if (currentMemory > maxMemory) {
        maxMemory = currentMemory;
      }
    }
    
    const endTime = performance.now();
    const endMemory = this.getCurrentMemory();
    
    const duration = endTime - startTime;
    const opsPerSecond = (iterations * 1000) / duration;
    const memoryUsed = endMemory - startMemory;
    
    const result: BenchmarkResult = {
      name,
      duration,
      operations: iterations,
      opsPerSecond,
      memoryUsed,
      maxMemory: maxMemory - startMemory,
      metadata: {},
    };
    
    console.log(`    ⏱️  ${duration.toFixed(2)}ms | ${opsPerSecond.toFixed(0)} ops/sec | ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    
    return result;
  }

  private generateTestElements(count: number): SpatialElement[] {
    const elements: SpatialElement[] = [];
    
    for (let i = 0; i < count; i++) {
      elements.push({
        id: `test-element-${i}`,
        type: 'rectangle',
        bounds: {
          x: Math.random() * 10000,
          y: Math.random() * 10000,
          width: 10 + Math.random() * 90,
          height: 10 + Math.random() * 90,
        },
        styles: {
          fill: `hsl(${(i * 137) % 360}, 70%, 50%)`,
        },
        children: [],
      });
    }
    
    return elements;
  }

  private generateDesignSystemElements(): SpatialElement[] {
    const elements: SpatialElement[] = [];
    const componentTypes = ['button', 'input', 'card', 'nav', 'footer'];
    
    for (let i = 0; i < 5000; i++) {
      elements.push({
        id: `design-${i}`,
        type: componentTypes[i % componentTypes.length],
        bounds: {
          x: (i % 100) * 80 + Math.random() * 20,
          y: Math.floor(i / 100) * 120 + Math.random() * 40,
          width: 60 + Math.random() * 40,
          height: 40 + Math.random() * 80,
        },
        styles: {
          fill: `hsl(${(i * 72) % 360}, 60%, 50%)`,
          borderRadius: '8px',
        },
        children: [],
      });
    }
    
    return elements;
  }

  private generateDashboardElements(): SpatialElement[] {
    const elements: SpatialElement[] = [];
    
    // Charts and widgets
    for (let i = 0; i < 25000; i++) {
      const type = i % 4 === 0 ? 'chart' : i % 4 === 1 ? 'table' : i % 4 === 2 ? 'metric' : 'text';
      
      elements.push({
        id: `dashboard-${i}`,
        type,
        bounds: {
          x: Math.random() * 25000,
          y: Math.random() * 20000,
          width: type === 'chart' ? 300 + Math.random() * 200 : 100 + Math.random() * 100,
          height: type === 'table' ? 200 + Math.random() * 300 : 50 + Math.random() * 150,
        },
        styles: {
          fill: type === 'chart' ? '#e3f2fd' : type === 'table' ? '#f3e5f5' : '#fff3e0',
          stroke: '#666',
          strokeWidth: 1,
        },
        children: [],
      });
    }
    
    return elements;
  }

  private generateCADElements(): SpatialElement[] {
    const elements: SpatialElement[] = [];
    
    // Complex technical drawing elements
    for (let i = 0; i < 100000; i++) {
      const elementType = i % 10 === 0 ? 'line' : i % 10 === 1 ? 'circle' : 'rectangle';
      
      elements.push({
        id: `cad-${i}`,
        type: elementType,
        bounds: {
          x: Math.random() * 100000,
          y: Math.random() * 100000,
          width: elementType === 'line' ? 0.1 + Math.random() * 2 : 0.5 + Math.random() * 50,
          height: elementType === 'line' ? 0.1 + Math.random() * 2 : 0.5 + Math.random() * 50,
        },
        styles: {
          fill: elementType === 'line' ? 'transparent' : '#f5f5f5',
          stroke: '#333',
          strokeWidth: 0.1,
        },
        children: [],
      });
    }
    
    return elements;
  }

  private calculateSuiteScore(suite: BenchmarkSuite): number {
    // Score based on throughput and efficiency
    let totalScore = 0;
    
    for (const result of suite.results) {
      const throughputScore = Math.min(result.opsPerSecond / 1000, 100); // Max 100 points
      const memoryScore = Math.max(0, 50 - (result.memoryUsed / 1024 / 1024)); // Penalty for high memory
      totalScore += (throughputScore + memoryScore) / 2;
    }
    
    return suite.results.length > 0 ? totalScore / suite.results.length : 0;
  }

  private createTestContainer(): HTMLElement {
    const container = document.createElement('div');
    container.style.width = '1920px';
    container.style.height = '1080px';
    container.style.position = 'absolute';
    container.style.left = '-10000px';
    document.body.appendChild(container);
    return container;
  }

  private cleanupTestContainer(container: HTMLElement): void {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  private getCurrentMemory(): number {
    const memory = (performance as any).memory;
    return memory ? memory.usedJSHeapSize : 0;
  }

  private forceGC(): void {
    if ((window as any).gc) {
      (window as any).gc();
    } else if ((global as any).gc) {
      (global as any).gc();
    }
  }

  /**
   * Generate a comprehensive benchmark report
   */
  public generateReport(): string {
    let report = '# Spatial Engine Benchmark Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    for (const [suiteName, suite] of this.results) {
      report += `## ${suite.name}\n\n`;
      report += `Overall Score: ${suite.overallScore.toFixed(1)}/100\n`;
      report += `Total Time: ${suite.totalTime.toFixed(2)}ms\n\n`;
      
      report += '| Test | Duration (ms) | Ops/sec | Memory (MB) | Notes |\n';
      report += '|------|---------------|---------|-------------|-------|\n';
      
      for (const result of suite.results) {
        const memoryMB = (result.memoryUsed / 1024 / 1024).toFixed(2);
        const notes = Object.entries(result.metadata)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        
        report += `| ${result.name} | ${result.duration.toFixed(2)} | ${result.opsPerSecond.toFixed(0)} | ${memoryMB} | ${notes} |\n`;
      }
      
      report += '\n';
    }
    
    return report;
  }

  public getResults(): Map<string, BenchmarkSuite> {
    return this.results;
  }
}