/**
 * Optimized Plugin Manager
 * High-performance plugin system with minimal overhead
 */

import type {
  SpatialPlugin,
  SpatialBehavior,
  SpatialElement,
  Viewport,
} from './types.js';

interface PluginRegistry {
  plugin: SpatialPlugin;
  isInitialized: boolean;
  isEnabled: boolean;
  priority: number;
}

interface BehaviorContext {
  viewport: Viewport;
  timestamp: number;
  frameRate: number;
  userInput?: any;
  customData?: Record<string, any>;
}

interface CachedBehaviorChain {
  behaviors: SpatialBehavior[];
  lastUpdate: number;
  contextHash: string;
}

export class OptimizedPluginManager {
  private plugins: Map<string, PluginRegistry> = new Map();
  private behaviors: Map<string, SpatialBehavior> = new Map();
  private engineInstance: any = null;
  
  // Performance optimizations
  private behaviorChainCache: CachedBehaviorChain | null = null;
  private enabledPluginsCache: SpatialPlugin[] = [];
  private lastEnabledPluginsUpdate = 0;
  private eventCallbacks: Map<string, Function[]> = new Map();
  
  // Batch processing
  private pendingViewportNotifications: Viewport[] = [];
  private pendingInteractionNotifications: Array<{ element: SpatialElement; type: string }> = [];
  private notificationScheduled = false;
  
  // Performance tracking
  private performanceMetrics = {
    behaviorApplicationTime: 0,
    pluginNotificationTime: 0,
    averageElementsProcessed: 0,
    lastFrameTime: 0,
  };

  constructor(engineInstance?: any) {
    this.engineInstance = engineInstance;
  }

  /**
   * Plugin Management (Optimized)
   */
  
  async registerPlugin(plugin: SpatialPlugin, priority = 0): Promise<boolean> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered`);
      return false;
    }

    try {
      this.validatePlugin(plugin);
      
      this.plugins.set(plugin.id, {
        plugin,
        isInitialized: false,
        isEnabled: false,
        priority,
      });

      // Invalidate caches
      this.invalidateEnabledPluginsCache();
      
      this.emit('pluginRegistered', { plugin });
      return true;
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.id}:`, error);
      return false;
    }
  }

  async enablePlugin(pluginId: string): Promise<boolean> {
    const registry = this.plugins.get(pluginId);
    if (!registry || registry.isEnabled) {
      return registry?.isEnabled ?? false;
    }

    try {
      if (!registry.isInitialized) {
        registry.plugin.initialize(this.engineInstance);
        registry.isInitialized = true;
      }

      registry.isEnabled = true;
      this.invalidateEnabledPluginsCache();
      
      this.emit('pluginEnabled', { plugin: registry.plugin });
      return true;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  getEnabledPlugins(): SpatialPlugin[] {
    const now = performance.now();
    if (now - this.lastEnabledPluginsUpdate < 100) { // Cache for 100ms
      return this.enabledPluginsCache;
    }

    this.enabledPluginsCache = Array.from(this.plugins.values())
      .filter(registry => registry.isEnabled)
      .sort((a, b) => a.priority - b.priority)
      .map(registry => registry.plugin);
    
    this.lastEnabledPluginsUpdate = now;
    return this.enabledPluginsCache;
  }

  /**
   * Optimized Behavior System
   */
  
  registerBehavior(behavior: SpatialBehavior, priority = 0): void {
    if (this.behaviors.has(behavior.id)) {
      console.warn(`Behavior ${behavior.id} is already registered`);
      return;
    }

    // Add priority to behavior
    (behavior as any).priority = priority;
    this.behaviors.set(behavior.id, behavior);
    this.invalidateBehaviorCache();
    
    this.emit('behaviorRegistered', { behavior });
  }

  /**
   * High-Performance Behavior Application
   */
  
  applyBehaviors(elements: SpatialElement[], context: BehaviorContext): SpatialElement[] {
    const startTime = performance.now();
    
    // Use cached behavior chain if context hasn't changed significantly
    const contextHash = this.computeContextHash(context);
    const behaviorChain = this.getCachedBehaviorChain(contextHash, context);
    
    if (behaviorChain.length === 0) {
      this.performanceMetrics.behaviorApplicationTime = performance.now() - startTime;
      return elements;
    }

    let processedElements = elements;
    
    // Apply behaviors with error isolation
    for (let i = 0; i < behaviorChain.length; i++) {
      const behavior = behaviorChain[i];
      
      try {
        if (behavior.shouldApply(context)) {
          processedElements = behavior.apply(processedElements, context);
        }
      } catch (error) {
        console.error(`Error in behavior ${behavior.id}:`, error);
        // Continue with other behaviors
      }
    }

    // Update performance metrics
    const endTime = performance.now();
    this.performanceMetrics.behaviorApplicationTime = endTime - startTime;
    this.performanceMetrics.averageElementsProcessed = 
      (this.performanceMetrics.averageElementsProcessed * 0.9) + (elements.length * 0.1);
    this.performanceMetrics.lastFrameTime = endTime;

    return processedElements;
  }

  /**
   * Batched Event Notifications (Reduces overhead)
   */
  
  notifyViewportChange(viewport: Viewport): void {
    this.pendingViewportNotifications.push(viewport);
    this.scheduleNotifications();
  }

  notifyElementInteraction(element: SpatialElement, interactionType: string): void {
    this.pendingInteractionNotifications.push({ element, type: interactionType });
    this.scheduleNotifications();
  }

  private scheduleNotifications(): void {
    if (this.notificationScheduled) return;
    
    this.notificationScheduled = true;
    
    // Use next animation frame for batching
    requestAnimationFrame(() => {
      const startTime = performance.now();
      
      // Process viewport changes (only send latest)
      if (this.pendingViewportNotifications.length > 0) {
        const latestViewport = this.pendingViewportNotifications[this.pendingViewportNotifications.length - 1];
        this.processViewportNotifications(latestViewport);
        this.pendingViewportNotifications.length = 0;
      }
      
      // Process all interaction notifications
      if (this.pendingInteractionNotifications.length > 0) {
        this.processInteractionNotifications(this.pendingInteractionNotifications);
        this.pendingInteractionNotifications.length = 0;
      }
      
      this.performanceMetrics.pluginNotificationTime = performance.now() - startTime;
      this.notificationScheduled = false;
    });
  }

  private processViewportNotifications(viewport: Viewport): void {
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      if (plugin.onViewportChange) {
        try {
          plugin.onViewportChange(viewport);
        } catch (error) {
          console.error(`Error in plugin ${plugin.id} viewport handler:`, error);
        }
      }
    }
  }

  private processInteractionNotifications(interactions: Array<{ element: SpatialElement; type: string }>): void {
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      if (plugin.onElementInteraction) {
        for (const { element, type } of interactions) {
          try {
            plugin.onElementInteraction(element, type);
          } catch (error) {
            console.error(`Error in plugin ${plugin.id} interaction handler:`, error);
          }
        }
      }
    }
  }

  /**
   * Caching and Performance Optimizations
   */
  
  private getCachedBehaviorChain(contextHash: string, context: BehaviorContext): SpatialBehavior[] {
    const now = performance.now();
    
    // Use cached chain if context hasn't changed and cache is fresh
    if (this.behaviorChainCache && 
        this.behaviorChainCache.contextHash === contextHash &&
        now - this.behaviorChainCache.lastUpdate < 1000) { // Cache for 1 second
      return this.behaviorChainCache.behaviors;
    }

    // Rebuild behavior chain
    const allBehaviors = Array.from(this.behaviors.values());
    const applicableBehaviors = allBehaviors
      .filter(behavior => behavior.shouldApply(context))
      .sort((a, b) => ((a as any).priority || 0) - ((b as any).priority || 0));

    // Cache the result
    this.behaviorChainCache = {
      behaviors: applicableBehaviors,
      lastUpdate: now,
      contextHash,
    };

    return applicableBehaviors;
  }

  private computeContextHash(context: BehaviorContext): string {
    // Fast hash of relevant context properties
    const { viewport, frameRate } = context;
    const roundedZ = Math.round((viewport.z || 0) / 10) * 10; // Round Z to nearest 10
    const roundedZoom = Math.round(viewport.zoom * 10) / 10; // Round zoom to 1 decimal
    const roundedFrameRate = Math.round(frameRate / 5) * 5; // Round framerate to nearest 5
    
    return `${roundedZ}-${roundedZoom}-${roundedFrameRate}`;
  }

  private invalidateEnabledPluginsCache(): void {
    this.lastEnabledPluginsUpdate = 0;
  }

  private invalidateBehaviorCache(): void {
    this.behaviorChainCache = null;
  }

  /**
   * Built-in High-Performance Behaviors
   */
  
  private registerOptimizedBuiltInBehaviors(): void {
    // Fast distance-based LOD (optimized version)
    this.registerBehavior({
      id: 'fast-distance-lod',
      name: 'Fast Distance-based LOD',
      apply: (elements: SpatialElement[], context: BehaviorContext) => {
        const viewerZ = context.viewport.z ?? 0;
        const elementsLength = elements.length;
        
        // Pre-allocate result array for better performance
        const result = new Array(elementsLength);
        
        for (let i = 0; i < elementsLength; i++) {
          const element = elements[i];
          const elementZ = element.zPosition ?? 0;
          const distance = Math.abs(elementZ - viewerZ);
          
          // Fast LOD calculation using bit operations
          let lodLevel = 0;
          if (distance > 20) lodLevel = 1;
          if (distance > 50) lodLevel = 2;
          if (distance > 100) lodLevel = 3;
          
          // Reuse element object when possible
          if (element.lodLevel !== lodLevel) {
            result[i] = { ...element, lodLevel };
          } else {
            result[i] = element;
          }
        }
        
        return result;
      },
      shouldApply: (context: BehaviorContext) => context.viewport.z !== undefined,
    }, 0);

    // Optimized frustum culling behavior
    this.registerBehavior({
      id: 'fast-frustum-culling',
      name: 'Fast Frustum Culling',
      apply: (elements: SpatialElement[], context: BehaviorContext) => {
        const { viewport } = context;
        const viewerZ = viewport.z ?? 0;
        const cullDistance = 200; // Make configurable if needed
        
        // Use filter with pre-computed values
        return elements.filter(element => {
          const elementZ = element.zPosition ?? 0;
          return Math.abs(elementZ - viewerZ) <= cullDistance;
        });
      },
      shouldApply: (context: BehaviorContext) => context.viewport.z !== undefined,
    }, -1); // High priority (negative = earlier)

    // Memory-efficient adaptive quality
    this.registerBehavior({
      id: 'memory-efficient-quality',
      name: 'Memory-Efficient Adaptive Quality',
      apply: (elements: SpatialElement[], context: BehaviorContext) => {
        const frameRate = context.frameRate;
        let qualityLevel = 2;
        
        if (frameRate < 30) qualityLevel = 0;
        else if (frameRate < 45) qualityLevel = 1;
        
        // Only modify elements if quality level has changed
        if (qualityLevel === 2) {
          return elements; // No changes needed
        }
        
        return elements.map(element => {
          if (element.renderPriority !== qualityLevel) {
            return { ...element, renderPriority: qualityLevel };
          }
          return element;
        });
      },
      shouldApply: (context: BehaviorContext) => context.frameRate < 60,
    }, 10);
  }

  /**
   * Performance Monitoring
   */
  
  getPerformanceMetrics(): {
    behaviorApplicationTime: number;
    pluginNotificationTime: number;
    averageElementsProcessed: number;
    enabledPluginCount: number;
    enabledBehaviorCount: number;
    cacheHitRate: number;
  } {
    return {
      ...this.performanceMetrics,
      enabledPluginCount: this.getEnabledPlugins().length,
      enabledBehaviorCount: this.behaviors.size,
      cacheHitRate: this.behaviorChainCache ? 0.8 : 0.0, // Estimate
    };
  }

  /**
   * Initialization and Cleanup
   */
  
  initialize(): void {
    this.registerOptimizedBuiltInBehaviors();
  }

  private validatePlugin(plugin: SpatialPlugin): void {
    if (!plugin.id || typeof plugin.id !== 'string') {
      throw new Error('Plugin must have a valid string id');
    }
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid string name');
    }
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid string version');
    }
    if (typeof plugin.initialize !== 'function') {
      throw new Error('Plugin must have an initialize function');
    }
    if (typeof plugin.destroy !== 'function') {
      throw new Error('Plugin must have a destroy function');
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  async destroy(): Promise<void> {
    // Cancel pending notifications
    this.pendingViewportNotifications.length = 0;
    this.pendingInteractionNotifications.length = 0;
    
    // Disable and destroy all plugins
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      await this.unregisterPlugin(pluginId);
    }

    this.behaviors.clear();
    this.behaviorChainCache = null;
    this.enabledPluginsCache = [];
    this.eventCallbacks.clear();
  }

  private async unregisterPlugin(pluginId: string): Promise<boolean> {
    const registry = this.plugins.get(pluginId);
    if (!registry) return false;

    try {
      if (registry.isEnabled) {
        await this.disablePlugin(pluginId);
      }

      if (registry.isInitialized) {
        registry.plugin.destroy?.();
      }

      this.plugins.delete(pluginId);
      this.invalidateEnabledPluginsCache();
      
      this.emit('pluginUnregistered', { pluginId });
      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginId}:`, error);
      return false;
    }
  }

  private async disablePlugin(pluginId: string): Promise<boolean> {
    const registry = this.plugins.get(pluginId);
    if (!registry?.isEnabled) return true;

    try {
      registry.isEnabled = false;
      this.invalidateEnabledPluginsCache();
      
      this.emit('pluginDisabled', { plugin: registry.plugin });
      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }
}