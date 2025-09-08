/**
 * Advanced render scheduler with adaptive frame budgeting
 * Maintains 60fps by intelligently scheduling expensive operations
 */

export interface RenderTask {
  id: string;
  execute: () => void;
  priority: number;
  estimatedTime: number;
  deadline?: number;
}

export interface FrameBudget {
  targetFrameTime: number;
  remainingTime: number;
  currentFrameStart: number;
  tasksExecuted: number;
  tasksSkipped: number;
}

export class RenderScheduler {
  private taskQueue: RenderTask[] = [];
  private frameBudget: FrameBudget;
  private isScheduled = false;
  private performanceHistory: number[] = [];
  private adaptiveFrameTarget: number;

  constructor(targetFPS = 60) {
    this.adaptiveFrameTarget = 1000 / targetFPS;
    this.frameBudget = {
      targetFrameTime: this.adaptiveFrameTarget,
      remainingTime: this.adaptiveFrameTarget,
      currentFrameStart: 0,
      tasksExecuted: 0,
      tasksSkipped: 0,
    };
  }

  /**
   * Schedule a task to be executed when there's available frame time
   */
  schedule(task: RenderTask): void {
    // Insert task maintaining priority order (higher priority first)
    const insertIndex = this.taskQueue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    if (!this.isScheduled) {
      this.scheduleFrame();
    }
  }

  /**
   * Schedule high priority task that must run this frame
   */
  scheduleImmediate(task: RenderTask): void {
    task.priority = Number.MAX_SAFE_INTEGER;
    task.deadline = performance.now() + this.frameBudget.remainingTime;
    this.schedule(task);
  }

  /**
   * Cancel a scheduled task
   */
  cancel(taskId: string): boolean {
    const index = this.taskQueue.findIndex(t => t.id === taskId);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all scheduled tasks
   */
  clear(): void {
    this.taskQueue.length = 0;
  }

  private scheduleFrame(): void {
    if (this.isScheduled) return;
    
    this.isScheduled = true;
    requestAnimationFrame(() => this.executeFrame());
  }

  private executeFrame(): void {
    const frameStart = performance.now();
    this.frameBudget.currentFrameStart = frameStart;
    this.frameBudget.remainingTime = this.adaptiveFrameTarget;
    this.frameBudget.tasksExecuted = 0;
    this.frameBudget.tasksSkipped = 0;

    // Execute tasks while we have frame time budget
    while (this.taskQueue.length > 0 && this.frameBudget.remainingTime > 1) {
      const task = this.taskQueue[0];
      
      // Skip task if estimated time exceeds remaining budget (unless it's urgent)
      const isUrgent = task.deadline && task.deadline < frameStart + this.frameBudget.remainingTime;
      if (!isUrgent && task.estimatedTime > this.frameBudget.remainingTime) {
        this.frameBudget.tasksSkipped++;
        break;
      }

      // Execute task
      const taskStart = performance.now();
      try {
        task.execute();
        this.frameBudget.tasksExecuted++;
      } catch (error) {
        console.error(`Task ${task.id} failed:`, error);
      }
      
      const taskTime = performance.now() - taskStart;
      this.frameBudget.remainingTime -= taskTime;
      
      // Update task time estimate (exponential moving average)
      task.estimatedTime = task.estimatedTime * 0.8 + taskTime * 0.2;
      
      this.taskQueue.shift();
    }

    // Update performance history
    const frameTime = performance.now() - frameStart;
    this.updatePerformanceHistory(frameTime);

    // Schedule next frame if there are remaining tasks
    this.isScheduled = false;
    if (this.taskQueue.length > 0) {
      this.scheduleFrame();
    }
  }

  private updatePerformanceHistory(frameTime: number): void {
    this.performanceHistory.push(frameTime);
    
    // Keep only last 60 frames
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
    }

    // Adapt frame target based on recent performance
    if (this.performanceHistory.length >= 10) {
      const averageFrameTime = this.performanceHistory.reduce((a, b) => a + b) / this.performanceHistory.length;
      
      // If we're consistently over budget, reduce target slightly
      if (averageFrameTime > this.adaptiveFrameTarget * 1.1) {
        this.adaptiveFrameTarget = Math.min(this.adaptiveFrameTarget * 1.05, 20); // Max 50fps
      }
      // If we're consistently under budget, increase target
      else if (averageFrameTime < this.adaptiveFrameTarget * 0.8) {
        this.adaptiveFrameTarget = Math.max(this.adaptiveFrameTarget * 0.98, 16.67); // Min 60fps
      }
    }
  }

  getStats(): {
    queueLength: number;
    averageFrameTime: number;
    currentFrameTarget: number;
    frameBudget: FrameBudget;
  } {
    const averageFrameTime = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((a, b) => a + b) / this.performanceHistory.length
      : 0;

    return {
      queueLength: this.taskQueue.length,
      averageFrameTime,
      currentFrameTarget: this.adaptiveFrameTarget,
      frameBudget: { ...this.frameBudget },
    };
  }
}

// Global render scheduler instance
export const globalRenderScheduler = new RenderScheduler(60);