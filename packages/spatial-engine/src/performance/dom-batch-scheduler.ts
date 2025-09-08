/**
 * DOM Batch Scheduler
 * Batches DOM updates to eliminate layout thrashing and improve UI performance
 */

type DOMUpdateFunction = () => void;

interface BatchedUpdate {
  fn: DOMUpdateFunction;
  priority: number;
  id?: string;
}

interface SchedulerStats {
  totalUpdates: number;
  batchesExecuted: number;
  averageBatchSize: number;
  frameTime: number;
  droppedFrames: number;
}

export class DOMBatchScheduler {
  private pendingUpdates = new Set<BatchedUpdate>();
  private uniqueUpdates = new Map<string, BatchedUpdate>(); // For deduplication
  private isScheduled = false;
  private frameId: number | null = null;
  
  // Performance tracking
  private stats: SchedulerStats = {
    totalUpdates: 0,
    batchesExecuted: 0,
    averageBatchSize: 0,
    frameTime: 0,
    droppedFrames: 0,
  };
  
  // Configuration
  private maxBatchSize = 100;
  private frameBudget = 8; // ms - budget per frame for DOM updates
  private priorityThreshold = 10; // High priority updates get processed first

  /**
   * Schedule a DOM update
   */
  schedule(updateFn: DOMUpdateFunction, priority = 0, id?: string): void {
    const update: BatchedUpdate = { fn: updateFn, priority, id };
    
    // Handle deduplication for unique updates (like slider value updates)
    if (id) {
      const existing = this.uniqueUpdates.get(id);
      if (existing) {
        // Replace existing update
        this.pendingUpdates.delete(existing);
      }
      this.uniqueUpdates.set(id, update);
    }
    
    this.pendingUpdates.add(update);
    this.ensureScheduled();
  }

  /**
   * Schedule multiple updates as a batch
   */
  scheduleBatch(updates: Array<{ fn: DOMUpdateFunction; priority?: number; id?: string }>): void {
    for (const { fn, priority = 0, id } of updates) {
      this.schedule(fn, priority, id);
    }
  }

  /**
   * High priority update - executes in next frame
   */
  scheduleImmediate(updateFn: DOMUpdateFunction, id?: string): void {
    this.schedule(updateFn, 100, id);
  }

  /**
   * Low priority update - can be deferred
   */
  scheduleDeferred(updateFn: DOMUpdateFunction, id?: string): void {
    this.schedule(updateFn, -10, id);
  }

  private ensureScheduled(): void {
    if (this.isScheduled) return;
    
    this.isScheduled = true;
    this.frameId = requestAnimationFrame(() => {
      this.processBatch();
    });
  }

  private processBatch(): void {
    const startTime = performance.now();
    this.isScheduled = false;
    this.frameId = null;
    
    if (this.pendingUpdates.size === 0) {
      return;
    }

    // Convert to array and sort by priority (high to low)
    const updates = Array.from(this.pendingUpdates).sort((a, b) => b.priority - a.priority);
    
    // Clear pending updates
    this.pendingUpdates.clear();
    this.uniqueUpdates.clear();
    
    let processedCount = 0;
    let currentTime = startTime;
    
    // Process updates within frame budget
    for (const update of updates) {
      if (processedCount >= this.maxBatchSize) {
        // Reschedule remaining updates
        this.rescheduleUpdates(updates.slice(processedCount));
        break;
      }
      
      // Check frame budget for non-critical updates
      if (update.priority < this.priorityThreshold) {
        currentTime = performance.now();
        if (currentTime - startTime > this.frameBudget) {
          // Reschedule remaining updates
          this.rescheduleUpdates(updates.slice(processedCount));
          this.stats.droppedFrames++;
          break;
        }
      }
      
      try {
        update.fn();
        processedCount++;
      } catch (error) {
        console.error('DOM update error:', error);
      }
    }
    
    // Update statistics
    const endTime = performance.now();
    this.stats.totalUpdates += processedCount;
    this.stats.batchesExecuted++;
    this.stats.frameTime = endTime - startTime;
    this.stats.averageBatchSize = this.stats.totalUpdates / this.stats.batchesExecuted;
  }

  private rescheduleUpdates(updates: BatchedUpdate[]): void {
    for (const update of updates) {
      this.pendingUpdates.add(update);
      if (update.id) {
        this.uniqueUpdates.set(update.id, update);
      }
    }
    this.ensureScheduled();
  }

  /**
   * Force immediate execution of all pending updates
   */
  flush(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    this.isScheduled = false;
    
    // Process all pending updates immediately
    const updates = Array.from(this.pendingUpdates).sort((a, b) => b.priority - a.priority);
    this.pendingUpdates.clear();
    this.uniqueUpdates.clear();
    
    for (const update of updates) {
      try {
        update.fn();
      } catch (error) {
        console.error('DOM update error:', error);
      }
    }
  }

  /**
   * Clear all pending updates
   */
  clear(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    this.isScheduled = false;
    this.pendingUpdates.clear();
    this.uniqueUpdates.clear();
  }

  /**
   * Get performance statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Configuration
   */
  setMaxBatchSize(size: number): void {
    this.maxBatchSize = size;
  }

  setFrameBudget(budget: number): void {
    this.frameBudget = budget;
  }

  setPriorityThreshold(threshold: number): void {
    this.priorityThreshold = threshold;
  }

  /**
   * Check if updates are pending
   */
  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }

  getPendingUpdateCount(): number {
    return this.pendingUpdates.size;
  }
}

/**
 * Specialized DOM update batchers for common operations
 */

export class TextContentBatcher {
  private scheduler: DOMBatchScheduler;
  private pendingTextUpdates = new Map<HTMLElement, string>();

  constructor(scheduler: DOMBatchScheduler) {
    this.scheduler = scheduler;
  }

  updateText(element: HTMLElement, text: string, priority = 0): void {
    this.pendingTextUpdates.set(element, text);
    
    const elementId = this.getElementId(element);
    this.scheduler.schedule(
      () => {
        const pendingText = this.pendingTextUpdates.get(element);
        if (pendingText !== undefined && element.textContent !== pendingText) {
          element.textContent = pendingText;
        }
        this.pendingTextUpdates.delete(element);
      },
      priority,
      `text-${elementId}`
    );
  }

  private getElementId(element: HTMLElement): string {
    return element.id || element.className || Math.random().toString(36);
  }
}

export class StyleBatcher {
  private scheduler: DOMBatchScheduler;
  private pendingStyleUpdates = new Map<HTMLElement, Map<string, string>>();

  constructor(scheduler: DOMBatchScheduler) {
    this.scheduler = scheduler;
  }

  updateStyle(element: HTMLElement, property: string, value: string, priority = 0): void {
    if (!this.pendingStyleUpdates.has(element)) {
      this.pendingStyleUpdates.set(element, new Map());
    }
    
    this.pendingStyleUpdates.get(element)!.set(property, value);
    
    const elementId = this.getElementId(element);
    this.scheduler.schedule(
      () => {
        const pendingStyles = this.pendingStyleUpdates.get(element);
        if (pendingStyles) {
          for (const [prop, val] of pendingStyles) {
            if ((element.style as any)[prop] !== val) {
              (element.style as any)[prop] = val;
            }
          }
        }
        this.pendingStyleUpdates.delete(element);
      },
      priority,
      `style-${elementId}`
    );
  }

  updateMultipleStyles(element: HTMLElement, styles: Record<string, string>, priority = 0): void {
    if (!this.pendingStyleUpdates.has(element)) {
      this.pendingStyleUpdates.set(element, new Map());
    }
    
    const pendingMap = this.pendingStyleUpdates.get(element)!;
    for (const [property, value] of Object.entries(styles)) {
      pendingMap.set(property, value);
    }
    
    const elementId = this.getElementId(element);
    this.scheduler.schedule(
      () => {
        const pendingStyles = this.pendingStyleUpdates.get(element);
        if (pendingStyles) {
          for (const [prop, val] of pendingStyles) {
            if ((element.style as any)[prop] !== val) {
              (element.style as any)[prop] = val;
            }
          }
        }
        this.pendingStyleUpdates.delete(element);
      },
      priority,
      `style-${elementId}`
    );
  }

  private getElementId(element: HTMLElement): string {
    return element.id || element.className || Math.random().toString(36);
  }
}

export class AttributeBatcher {
  private scheduler: DOMBatchScheduler;
  private pendingAttributeUpdates = new Map<HTMLElement, Map<string, string>>();

  constructor(scheduler: DOMBatchScheduler) {
    this.scheduler = scheduler;
  }

  updateAttribute(element: HTMLElement, attribute: string, value: string, priority = 0): void {
    if (!this.pendingAttributeUpdates.has(element)) {
      this.pendingAttributeUpdates.set(element, new Map());
    }
    
    this.pendingAttributeUpdates.get(element)!.set(attribute, value);
    
    const elementId = this.getElementId(element);
    this.scheduler.schedule(
      () => {
        const pendingAttributes = this.pendingAttributeUpdates.get(element);
        if (pendingAttributes) {
          for (const [attr, val] of pendingAttributes) {
            if (element.getAttribute(attr) !== val) {
              element.setAttribute(attr, val);
            }
          }
        }
        this.pendingAttributeUpdates.delete(element);
      },
      priority,
      `attr-${elementId}`
    );
  }

  private getElementId(element: HTMLElement): string {
    return element.id || element.className || Math.random().toString(36);
  }
}

/**
 * Global scheduler instance and convenience functions
 */
let globalScheduler: DOMBatchScheduler | null = null;
let globalTextBatcher: TextContentBatcher | null = null;
let globalStyleBatcher: StyleBatcher | null = null;
let globalAttributeBatcher: AttributeBatcher | null = null;

export function getDOMScheduler(): DOMBatchScheduler {
  if (!globalScheduler) {
    globalScheduler = new DOMBatchScheduler();
  }
  return globalScheduler;
}

export function getTextBatcher(): TextContentBatcher {
  if (!globalTextBatcher) {
    globalTextBatcher = new TextContentBatcher(getDOMScheduler());
  }
  return globalTextBatcher;
}

export function getStyleBatcher(): StyleBatcher {
  if (!globalStyleBatcher) {
    globalStyleBatcher = new StyleBatcher(getDOMScheduler());
  }
  return globalStyleBatcher;
}

export function getAttributeBatcher(): AttributeBatcher {
  if (!globalAttributeBatcher) {
    globalAttributeBatcher = new AttributeBatcher(getDOMScheduler());
  }
  return globalAttributeBatcher;
}

// Convenience functions for common operations
export const batchTextUpdate = (element: HTMLElement, text: string, priority = 0) => {
  getTextBatcher().updateText(element, text, priority);
};

export const batchStyleUpdate = (element: HTMLElement, property: string, value: string, priority = 0) => {
  getStyleBatcher().updateStyle(element, property, value, priority);
};

export const batchStyleUpdates = (element: HTMLElement, styles: Record<string, string>, priority = 0) => {
  getStyleBatcher().updateMultipleStyles(element, styles, priority);
};

export const batchAttributeUpdate = (element: HTMLElement, attribute: string, value: string, priority = 0) => {
  getAttributeBatcher().updateAttribute(element, attribute, value, priority);
};

export const flushDOMUpdates = () => {
  getDOMScheduler().flush();
};