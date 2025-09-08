import { RenderScheduler } from '../render-scheduler.js';
import type { RenderTask } from '../render-scheduler.js';

describe('RenderScheduler', () => {
  let scheduler: RenderScheduler;

  beforeEach(() => {
    scheduler = new RenderScheduler(60);
  });

  afterEach(() => {
    scheduler.clear();
  });

  describe('task scheduling', () => {
    it('should schedule tasks in priority order', (done) => {
      const executionOrder: string[] = [];

      const lowPriorityTask: RenderTask = {
        id: 'low',
        execute: () => executionOrder.push('low'),
        priority: 1,
        estimatedTime: 1,
      };

      const highPriorityTask: RenderTask = {
        id: 'high',
        execute: () => executionOrder.push('high'),
        priority: 10,
        estimatedTime: 1,
      };

      const mediumPriorityTask: RenderTask = {
        id: 'medium',
        execute: () => executionOrder.push('medium'),
        priority: 5,
        estimatedTime: 1,
      };

      scheduler.schedule(lowPriorityTask);
      scheduler.schedule(highPriorityTask);
      scheduler.schedule(mediumPriorityTask);

      // Wait for tasks to execute
      setTimeout(() => {
        expect(executionOrder).toEqual(['high', 'medium', 'low']);
        done();
      }, 100);
    });

    it('should execute tasks within frame budget', (done) => {
      const executedTasks: string[] = [];
      const heavyTask = (id: string): RenderTask => ({
        id,
        execute: () => {
          executedTasks.push(id);
          // Simulate heavy work
          const start = performance.now();
          while (performance.now() - start < 5) {
            Math.sqrt(Math.random());
          }
        },
        priority: 1,
        estimatedTime: 5,
      });

      // Schedule more tasks than can fit in one frame
      for (let i = 0; i < 10; i++) {
        scheduler.schedule(heavyTask(`task-${i}`));
      }

      setTimeout(() => {
        expect(executedTasks.length).toBeGreaterThan(0);
        expect(executedTasks.length).toBeLessThan(10); // Some should be deferred
        done();
      }, 100);
    });

    it('should handle task execution errors gracefully', (done) => {
      const executedTasks: string[] = [];
      const goodTask: RenderTask = {
        id: 'good',
        execute: () => executedTasks.push('good'),
        priority: 1,
        estimatedTime: 1,
      };

      const badTask: RenderTask = {
        id: 'bad',
        execute: () => {
          throw new Error('Task failed');
        },
        priority: 2,
        estimatedTime: 1,
      };

      const anotherGoodTask: RenderTask = {
        id: 'good2',
        execute: () => executedTasks.push('good2'),
        priority: 1,
        estimatedTime: 1,
      };

      scheduler.schedule(goodTask);
      scheduler.schedule(badTask);
      scheduler.schedule(anotherGoodTask);

      setTimeout(() => {
        expect(executedTasks).toContain('good');
        expect(executedTasks).toContain('good2');
        done();
      }, 100);
    });
  });

  describe('immediate scheduling', () => {
    it('should prioritize immediate tasks', (done) => {
      const executionOrder: string[] = [];

      const normalTask: RenderTask = {
        id: 'normal',
        execute: () => executionOrder.push('normal'),
        priority: 5,
        estimatedTime: 1,
      };

      const immediateTask: RenderTask = {
        id: 'immediate',
        execute: () => executionOrder.push('immediate'),
        priority: 1,
        estimatedTime: 1,
      };

      scheduler.schedule(normalTask);
      scheduler.scheduleImmediate(immediateTask);

      setTimeout(() => {
        expect(executionOrder[0]).toBe('immediate');
        done();
      }, 100);
    });

    it('should set deadline for immediate tasks', () => {
      const immediateTask: RenderTask = {
        id: 'immediate',
        execute: () => {},
        priority: 1,
        estimatedTime: 1,
      };

      const beforeSchedule = performance.now();
      scheduler.scheduleImmediate(immediateTask);

      expect(immediateTask.priority).toBe(Number.MAX_SAFE_INTEGER);
      expect(immediateTask.deadline).toBeGreaterThan(beforeSchedule);
    });
  });

  describe('task cancellation', () => {
    it('should cancel scheduled tasks', () => {
      const task: RenderTask = {
        id: 'cancelable',
        execute: () => {},
        priority: 1,
        estimatedTime: 1,
      };

      scheduler.schedule(task);
      const cancelled = scheduler.cancel('cancelable');

      expect(cancelled).toBe(true);
    });

    it('should return false when canceling non-existent task', () => {
      const cancelled = scheduler.cancel('non-existent');
      expect(cancelled).toBe(false);
    });

    it('should clear all tasks', (done) => {
      const executedTasks: string[] = [];

      for (let i = 0; i < 5; i++) {
        scheduler.schedule({
          id: `task-${i}`,
          execute: () => executedTasks.push(`task-${i}`),
          priority: 1,
          estimatedTime: 1,
        });
      }

      scheduler.clear();

      setTimeout(() => {
        expect(executedTasks).toHaveLength(0);
        done();
      }, 100);
    });
  });

  describe('performance adaptation', () => {
    it('should adapt frame target based on performance history', () => {
      const initialStats = scheduler.getStats();
      const initialTarget = initialStats.currentFrameTarget;

      // Simulate poor performance
      for (let i = 0; i < 15; i++) {
        scheduler['updatePerformanceHistory'](25); // 25ms = 40fps
      }

      const adaptedStats = scheduler.getStats();
      expect(adaptedStats.currentFrameTarget).toBeGreaterThan(initialTarget);
    });

    it('should improve frame target when performance is good', () => {
      // First simulate poor performance to raise the target
      for (let i = 0; i < 15; i++) {
        scheduler['updatePerformanceHistory'](25);
      }

      const poorPerformanceStats = scheduler.getStats();
      const raisedTarget = poorPerformanceStats.currentFrameTarget;

      // Then simulate good performance
      for (let i = 0; i < 15; i++) {
        scheduler['updatePerformanceHistory'](10); // 10ms = 100fps
      }

      const goodPerformanceStats = scheduler.getStats();
      expect(goodPerformanceStats.currentFrameTarget).toBeLessThan(raisedTarget);
    });

    it('should limit frame target within reasonable bounds', () => {
      // Test maximum bound (50fps = 20ms)
      for (let i = 0; i < 20; i++) {
        scheduler['updatePerformanceHistory'](50); // Very poor performance
      }

      const maxBoundStats = scheduler.getStats();
      expect(maxBoundStats.currentFrameTarget).toBeLessThanOrEqual(20);

      // Test minimum bound (60fps = 16.67ms)
      const newScheduler = new RenderScheduler(60);
      for (let i = 0; i < 20; i++) {
        newScheduler['updatePerformanceHistory'](1); // Excellent performance
      }

      const minBoundStats = newScheduler.getStats();
      expect(minBoundStats.currentFrameTarget).toBeGreaterThanOrEqual(16.67);
    });
  });

  describe('task time estimation', () => {
    it('should update task time estimates based on actual execution', (done) => {
      let actualExecutionTime = 0;
      const task: RenderTask = {
        id: 'timed-task',
        execute: () => {
          const start = performance.now();
          while (performance.now() - start < 10) {
            Math.sqrt(Math.random());
          }
        },
        priority: 1,
        estimatedTime: 1, // Underestimate
      };

      scheduler.schedule(task);

      setTimeout(() => {
        // The estimated time should have been updated closer to actual
        expect(task.estimatedTime).toBeGreaterThan(5);
        done();
      }, 100);
    });
  });

  describe('frame budget management', () => {
    it('should track frame budget statistics', (done) => {
      const quickTask: RenderTask = {
        id: 'quick',
        execute: () => {},
        priority: 1,
        estimatedTime: 1,
      };

      scheduler.schedule(quickTask);

      setTimeout(() => {
        const stats = scheduler.getStats();
        expect(stats.frameBudget.tasksExecuted).toBeGreaterThan(0);
        expect(stats.frameBudget.currentFrameStart).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should skip tasks when budget is exceeded', (done) => {
      const executedTasks: string[] = [];
      const heavyTask = (id: string): RenderTask => ({
        id,
        execute: () => executedTasks.push(id),
        priority: 1,
        estimatedTime: 100, // Very expensive tasks
      });

      // Schedule tasks that exceed frame budget
      for (let i = 0; i < 3; i++) {
        scheduler.schedule(heavyTask(`heavy-${i}`));
      }

      setTimeout(() => {
        const stats = scheduler.getStats();
        expect(stats.frameBudget.tasksSkipped).toBeGreaterThan(0);
        expect(executedTasks.length).toBeLessThan(3);
        done();
      }, 100);
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide accurate queue length', () => {
      for (let i = 0; i < 5; i++) {
        scheduler.schedule({
          id: `task-${i}`,
          execute: () => {},
          priority: 1,
          estimatedTime: 1,
        });
      }

      const stats = scheduler.getStats();
      expect(stats.queueLength).toBe(5);
    });

    it('should calculate average frame time', () => {
      // Simulate frame times
      for (let i = 0; i < 5; i++) {
        scheduler['updatePerformanceHistory'](15 + Math.random() * 5);
      }

      const stats = scheduler.getStats();
      expect(stats.averageFrameTime).toBeGreaterThan(15);
      expect(stats.averageFrameTime).toBeLessThan(20);
    });

    it('should provide frame budget information', () => {
      const stats = scheduler.getStats();
      expect(stats.frameBudget).toBeDefined();
      expect(typeof stats.frameBudget.targetFrameTime).toBe('number');
      expect(typeof stats.frameBudget.remainingTime).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle zero estimated time tasks', (done) => {
      const task: RenderTask = {
        id: 'zero-time',
        execute: () => {},
        priority: 1,
        estimatedTime: 0,
      };

      scheduler.schedule(task);

      setTimeout(() => {
        const stats = scheduler.getStats();
        expect(stats.frameBudget.tasksExecuted).toBe(1);
        done();
      }, 100);
    });

    it('should handle negative priority tasks', (done) => {
      const executionOrder: string[] = [];

      scheduler.schedule({
        id: 'negative',
        execute: () => executionOrder.push('negative'),
        priority: -5,
        estimatedTime: 1,
      });

      scheduler.schedule({
        id: 'positive',
        execute: () => executionOrder.push('positive'),
        priority: 1,
        estimatedTime: 1,
      });

      setTimeout(() => {
        expect(executionOrder).toEqual(['positive', 'negative']);
        done();
      }, 100);
    });

    it('should handle tasks with same priority', (done) => {
      const executionOrder: string[] = [];

      scheduler.schedule({
        id: 'first',
        execute: () => executionOrder.push('first'),
        priority: 1,
        estimatedTime: 1,
      });

      scheduler.schedule({
        id: 'second',
        execute: () => executionOrder.push('second'),
        priority: 1,
        estimatedTime: 1,
      });

      setTimeout(() => {
        expect(executionOrder).toEqual(['first', 'second']); // FIFO for same priority
        done();
      }, 100);
    });
  });
});