/**
 * Memory profiler for detecting leaks and optimizing memory usage
 * Provides real-time memory monitoring and leak detection
 */

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  customMetrics: Record<string, number>;
}

export interface LeakDetectionResult {
  isLeaking: boolean;
  growthRate: number; // bytes per second
  confidence: number; // 0-1
  snapshots: MemorySnapshot[];
  recommendations: string[];
}

export interface MemoryAllocation {
  id: string;
  size: number;
  timestamp: number;
  stackTrace?: string;
  metadata?: any;
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private allocations: Map<string, MemoryAllocation> = new Map();
  private customMetrics: Map<string, () => number> = new Map();
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private maxSnapshots = 1000;
  private samplingInterval = 1000; // 1 second
  
  // Thresholds for leak detection
  private leakThresholds = {
    minGrowthRate: 1024 * 10, // 10KB/s
    minConfidence: 0.7,
    minSamples: 10,
    maxStagnantPeriod: 30000, // 30 seconds
  };

  constructor(options: {
    maxSnapshots?: number;
    samplingInterval?: number;
    leakThresholds?: Partial<typeof MemoryProfiler.prototype.leakThresholds>;
  } = {}) {
    this.maxSnapshots = options.maxSnapshots ?? 1000;
    this.samplingInterval = options.samplingInterval ?? 1000;
    
    if (options.leakThresholds) {
      this.leakThresholds = { ...this.leakThresholds, ...options.leakThresholds };
    }
    
    this.setupDefaultMetrics();
  }

  /**
   * Start continuous memory monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.takeSnapshot();
    
    this.monitoringInterval = (typeof window !== 'undefined' ? window : (globalThis as any)).setInterval(() => {
      this.takeSnapshot();
    }, this.samplingInterval);
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Take a memory snapshot
   */
  public takeSnapshot(): MemorySnapshot {
    const now = performance.now();
    const memory = (performance as any).memory;
    
    const customMetrics: Record<string, number> = {};
    for (const [name, getter] of this.customMetrics.entries()) {
      try {
        customMetrics[name] = getter();
      } catch (error) {
        console.warn(`Failed to collect custom metric '${name}':`, error);
        customMetrics[name] = 0;
      }
    }
    
    const snapshot: MemorySnapshot = {
      timestamp: now,
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
      totalJSHeapSize: memory?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      customMetrics,
    };
    
    this.snapshots.push(snapshot);
    
    // Trim old snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    
    return snapshot;
  }

  /**
   * Detect potential memory leaks
   */
  public detectLeaks(): LeakDetectionResult {
    if (this.snapshots.length < this.leakThresholds.minSamples) {
      return {
        isLeaking: false,
        growthRate: 0,
        confidence: 0,
        snapshots: [...this.snapshots],
        recommendations: ['Insufficient data for leak detection. Continue monitoring.'],
      };
    }
    
    const recentSnapshots = this.snapshots.slice(-this.leakThresholds.minSamples);
    const growthAnalysis = this.analyzeMemoryGrowth(recentSnapshots);
    const stagnationAnalysis = this.analyzeMemoryStagnation(recentSnapshots);
    
    const isLeaking = 
      growthAnalysis.growthRate > this.leakThresholds.minGrowthRate &&
      growthAnalysis.confidence > this.leakThresholds.minConfidence;
    
    const recommendations = this.generateRecommendations(growthAnalysis, stagnationAnalysis);
    
    return {
      isLeaking,
      growthRate: growthAnalysis.growthRate,
      confidence: growthAnalysis.confidence,
      snapshots: [...recentSnapshots],
      recommendations,
    };
  }

  /**
   * Track a memory allocation
   */
  public trackAllocation(id: string, size: number, metadata?: any): void {
    const allocation: MemoryAllocation = {
      id,
      size,
      timestamp: performance.now(),
      stackTrace: this.captureStackTrace(),
      metadata,
    };
    
    this.allocations.set(id, allocation);
  }

  /**
   * Release a tracked allocation
   */
  public releaseAllocation(id: string): boolean {
    return this.allocations.delete(id);
  }

  /**
   * Get all unreleased allocations
   */
  public getUnreleasedAllocations(): MemoryAllocation[] {
    return Array.from(this.allocations.values());
  }

  /**
   * Register a custom memory metric
   */
  public addCustomMetric(name: string, getter: () => number): void {
    this.customMetrics.set(name, getter);
  }

  /**
   * Remove a custom metric
   */
  public removeCustomMetric(name: string): boolean {
    return this.customMetrics.delete(name);
  }

  /**
   * Get current memory usage statistics
   */
  public getCurrentStats(): {
    currentUsage: number;
    totalAllocated: number;
    unreleased: number;
    growthRate: number;
    efficiency: number;
  } {
    const latest = this.snapshots[this.snapshots.length - 1];
    const currentUsage = latest?.usedJSHeapSize || 0;
    
    const totalAllocated = Array.from(this.allocations.values())
      .reduce((sum, alloc) => sum + alloc.size, 0);
    
    const unreleased = this.allocations.size;
    
    const growthRate = this.snapshots.length >= 2 
      ? this.calculateGrowthRate(this.snapshots.slice(-10))
      : 0;
    
    const efficiency = totalAllocated > 0 ? currentUsage / totalAllocated : 1;
    
    return {
      currentUsage,
      totalAllocated,
      unreleased,
      growthRate,
      efficiency,
    };
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGC(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    } else if (typeof globalThis !== 'undefined' && (globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }

  /**
   * Export snapshots for analysis
   */
  public exportSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Import snapshots from external source
   */
  public importSnapshots(snapshots: MemorySnapshot[]): void {
    this.snapshots = [...snapshots];
    
    // Trim if necessary
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  private setupDefaultMetrics(): void {
    // DOM element count
    this.addCustomMetric('domElements', () => typeof document !== 'undefined' ? document.getElementsByTagName('*').length : 0);
    
    // Event listeners (approximate)
    this.addCustomMetric('eventListeners', () => this.estimateEventListeners());
    
    // Canvas contexts
    this.addCustomMetric('canvasContexts', () => typeof document !== 'undefined' ? document.querySelectorAll('canvas').length : 0);
  }

  private analyzeMemoryGrowth(snapshots: MemorySnapshot[]): {
    growthRate: number;
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (snapshots.length < 2) {
      return { growthRate: 0, confidence: 0, trend: 'stable' };
    }
    
    const timeSpan = snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp;
    const memoryDiff = snapshots[snapshots.length - 1].usedJSHeapSize - snapshots[0].usedJSHeapSize;
    
    const growthRate = (memoryDiff / timeSpan) * 1000; // bytes per second
    
    // Calculate confidence based on consistency of growth
    const confidence = this.calculateGrowthConfidence(snapshots);
    
    const trend = growthRate > 1024 ? 'increasing' : 
                  growthRate < -1024 ? 'decreasing' : 'stable';
    
    return { growthRate, confidence, trend };
  }

  private analyzeMemoryStagnation(snapshots: MemorySnapshot[]): {
    isStagnant: boolean;
    stagnantPeriod: number;
    averageUsage: number;
  } {
    if (snapshots.length < 5) {
      return { isStagnant: false, stagnantPeriod: 0, averageUsage: 0 };
    }
    
    const recentSnapshots = snapshots.slice(-10);
    const usage = recentSnapshots.map(s => s.usedJSHeapSize);
    const averageUsage = usage.reduce((sum, u) => sum + u, 0) / usage.length;
    const variance = usage.reduce((sum, u) => sum + Math.pow(u - averageUsage, 2), 0) / usage.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Consider memory stagnant if standard deviation is very low
    const isStagnant = standardDeviation < averageUsage * 0.01; // 1% variation
    
    const stagnantPeriod = isStagnant 
      ? recentSnapshots[recentSnapshots.length - 1].timestamp - recentSnapshots[0].timestamp
      : 0;
    
    return { isStagnant, stagnantPeriod, averageUsage };
  }

  private calculateGrowthRate(snapshots: MemorySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    
    const timeSpan = snapshots[snapshots.length - 1].timestamp - snapshots[0].timestamp;
    const memoryDiff = snapshots[snapshots.length - 1].usedJSHeapSize - snapshots[0].usedJSHeapSize;
    
    return (memoryDiff / timeSpan) * 1000; // bytes per second
  }

  private calculateGrowthConfidence(snapshots: MemorySnapshot[]): number {
    if (snapshots.length < 3) return 0;
    
    const growthRates: number[] = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const timeDiff = snapshots[i].timestamp - snapshots[i - 1].timestamp;
      const memoryDiff = snapshots[i].usedJSHeapSize - snapshots[i - 1].usedJSHeapSize;
      growthRates.push((memoryDiff / timeDiff) * 1000);
    }
    
    const average = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - average, 2), 0) / growthRates.length;
    
    // Confidence is inversely related to variance (more consistent = higher confidence)
    const maxVariance = Math.pow(average, 2); // Theoretical maximum variance
    const confidence = maxVariance > 0 ? Math.max(0, 1 - (variance / maxVariance)) : 0;
    
    return Math.min(1, confidence);
  }

  private generateRecommendations(
    growthAnalysis: ReturnType<typeof MemoryProfiler.prototype.analyzeMemoryGrowth>,
    stagnationAnalysis: ReturnType<typeof MemoryProfiler.prototype.analyzeMemoryStagnation>
  ): string[] {
    const recommendations: string[] = [];
    
    if (growthAnalysis.growthRate > this.leakThresholds.minGrowthRate) {
      recommendations.push(`Memory growing at ${Math.round(growthAnalysis.growthRate / 1024)}KB/s - investigate potential leaks`);
      
      if (growthAnalysis.confidence > 0.8) {
        recommendations.push('High confidence leak detected - immediate investigation recommended');
      }
      
      const unreleasedCount = this.allocations.size;
      if (unreleasedCount > 0) {
        recommendations.push(`${unreleasedCount} unreleased allocations tracked - review for proper cleanup`);
      }
    }
    
    if (stagnationAnalysis.isStagnant && stagnationAnalysis.stagnantPeriod > this.leakThresholds.maxStagnantPeriod) {
      recommendations.push('Memory usage is stagnant - may indicate memory not being released after use');
    }
    
    // Custom metric recommendations
    const latest = this.snapshots[this.snapshots.length - 1];
    if (latest) {
      if (latest.customMetrics.domElements > 10000) {
        recommendations.push('High DOM element count detected - consider virtual scrolling or element cleanup');
      }
      
      if (latest.customMetrics.eventListeners > 1000) {
        recommendations.push('High event listener count - ensure proper cleanup of event handlers');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears healthy');
    }
    
    return recommendations;
  }

  private captureStackTrace(): string {
    try {
      throw new Error('Stack trace');
    } catch (error) {
      return (error as Error).stack || 'Stack trace not available';
    }
  }

  private estimateEventListeners(): number {
    if (typeof document === 'undefined') return 0;
    
    // This is an approximation since there's no direct way to count event listeners
    let count = 0;
    
    // Count elements with common event attributes
    const eventAttributes = ['onclick', 'onchange', 'onsubmit', 'onload', 'onerror'];
    for (const attr of eventAttributes) {
      count += document.querySelectorAll(`[${attr}]`).length;
    }
    
    // Add some estimation for programmatically added listeners
    count += document.querySelectorAll('button, input, a, form').length;
    
    return count;
  }

  /**
   * Reset all monitoring data
   */
  public reset(): void {
    this.snapshots = [];
    this.allocations.clear();
  }
}