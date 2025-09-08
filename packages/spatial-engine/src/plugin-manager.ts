/**
 * Plugin Manager for Extensible Spatial Behaviors
 * Manages plugins and behaviors for the spatial engine
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
}

interface BehaviorContext {
  viewport: Viewport;
  timestamp: number;
  frameRate: number;
  userInput?: any;
  customData?: Record<string, any>;
}

export class PluginManager {
  private plugins: Map<string, PluginRegistry> = new Map();
  private behaviors: Map<string, SpatialBehavior> = new Map();
  private engineInstance: any = null;
  private behaviorChain: SpatialBehavior[] = [];
  
  // Event system
  private eventCallbacks: Map<string, Function[]> = new Map();

  constructor(engineInstance?: any) {
    this.engineInstance = engineInstance;
  }

  /**
   * Plugin Management
   */
  
  async registerPlugin(plugin: SpatialPlugin): Promise<boolean> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered`);
      return false;
    }

    try {
      // Validate plugin structure
      this.validatePlugin(plugin);
      
      // Register the plugin
      this.plugins.set(plugin.id, {
        plugin,
        isInitialized: false,
        isEnabled: false,
      });

      this.emit('pluginRegistered', { plugin });
      return true;
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.id}:`, error);
      return false;
    }
  }

  async unregisterPlugin(pluginId: string): Promise<boolean> {
    const registry = this.plugins.get(pluginId);
    if (!registry) {
      console.warn(`Plugin ${pluginId} is not registered`);
      return false;
    }

    try {
      // Disable and destroy plugin if needed
      if (registry.isEnabled) {
        await this.disablePlugin(pluginId);
      }

      if (registry.isInitialized) {
        registry.plugin.destroy?.();
      }

      this.plugins.delete(pluginId);
      this.emit('pluginUnregistered', { pluginId });
      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginId}:`, error);
      return false;
    }
  }

  async enablePlugin(pluginId: string): Promise<boolean> {
    const registry = this.plugins.get(pluginId);
    if (!registry) {
      console.error(`Plugin ${pluginId} is not registered`);
      return false;
    }

    if (registry.isEnabled) {
      return true; // Already enabled
    }

    try {
      // Initialize plugin if not already done
      if (!registry.isInitialized) {
        registry.plugin.initialize(this.engineInstance);
        registry.isInitialized = true;
      }

      registry.isEnabled = true;
      this.emit('pluginEnabled', { plugin: registry.plugin });
      return true;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    const registry = this.plugins.get(pluginId);
    if (!registry) {
      console.error(`Plugin ${pluginId} is not registered`);
      return false;
    }

    if (!registry.isEnabled) {
      return true; // Already disabled
    }

    try {
      registry.isEnabled = false;
      this.emit('pluginDisabled', { plugin: registry.plugin });
      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  getPlugin(pluginId: string): SpatialPlugin | null {
    const registry = this.plugins.get(pluginId);
    return registry?.plugin ?? null;
  }

  getEnabledPlugins(): SpatialPlugin[] {
    return Array.from(this.plugins.values())
      .filter(registry => registry.isEnabled)
      .map(registry => registry.plugin);
  }

  getAllPlugins(): SpatialPlugin[] {
    return Array.from(this.plugins.values()).map(registry => registry.plugin);
  }

  /**
   * Behavior Management
   */
  
  registerBehavior(behavior: SpatialBehavior): void {
    if (this.behaviors.has(behavior.id)) {
      console.warn(`Behavior ${behavior.id} is already registered`);
      return;
    }

    this.behaviors.set(behavior.id, behavior);
    this.rebuildBehaviorChain();
    this.emit('behaviorRegistered', { behavior });
  }

  unregisterBehavior(behaviorId: string): void {
    if (this.behaviors.delete(behaviorId)) {
      this.rebuildBehaviorChain();
      this.emit('behaviorUnregistered', { behaviorId });
    }
  }

  getBehavior(behaviorId: string): SpatialBehavior | null {
    return this.behaviors.get(behaviorId) ?? null;
  }

  getAllBehaviors(): SpatialBehavior[] {
    return Array.from(this.behaviors.values());
  }

  /**
   * Behavior Chain Execution
   */
  
  applyBehaviors(elements: SpatialElement[], context: BehaviorContext): SpatialElement[] {
    let processedElements = elements;

    for (const behavior of this.behaviorChain) {
      if (behavior.shouldApply(context)) {
        try {
          processedElements = behavior.apply(processedElements, context);
        } catch (error) {
          console.error(`Error applying behavior ${behavior.id}:`, error);
          // Continue with other behaviors
        }
      }
    }

    return processedElements;
  }

  private rebuildBehaviorChain(): void {
    // Sort behaviors by priority if they have one, otherwise maintain registration order
    this.behaviorChain = Array.from(this.behaviors.values()).sort((a, b) => {
      const aPriority = (a as any).priority ?? 0;
      const bPriority = (b as any).priority ?? 0;
      return aPriority - bPriority;
    });
  }

  /**
   * Event Forwarding to Plugins
   */
  
  notifyViewportChange(viewport: Viewport): void {
    for (const registry of this.plugins.values()) {
      if (registry.isEnabled && registry.plugin.onViewportChange) {
        try {
          registry.plugin.onViewportChange(viewport);
        } catch (error) {
          console.error(`Error in plugin ${registry.plugin.id} viewport change handler:`, error);
        }
      }
    }
  }

  notifyElementInteraction(element: SpatialElement, interactionType: string): void {
    for (const registry of this.plugins.values()) {
      if (registry.isEnabled && registry.plugin.onElementInteraction) {
        try {
          registry.plugin.onElementInteraction(element, interactionType);
        } catch (error) {
          console.error(`Error in plugin ${registry.plugin.id} element interaction handler:`, error);
        }
      }
    }
  }

  /**
   * Built-in Behaviors
   */
  
  private registerBuiltInBehaviors(): void {
    // Distance-based LOD behavior
    this.registerBehavior({
      id: 'distance-lod',
      name: 'Distance-based Level of Detail',
      apply: (elements: SpatialElement[], context: BehaviorContext) => {
        const viewportZ = context.viewport.z ?? 0;
        
        return elements.map(element => {
          const elementZ = element.zPosition ?? 0;
          const distance = Math.abs(elementZ - viewportZ);
          
          // Adjust LOD level based on distance
          let lodLevel = 0; // Full detail
          if (distance > 50) lodLevel = 1; // Medium detail
          if (distance > 100) lodLevel = 2; // Low detail
          if (distance > 200) lodLevel = 3; // Minimal detail
          
          return {
            ...element,
            lodLevel,
          };
        });
      },
      shouldApply: (context: BehaviorContext) => context.viewport.z !== undefined,
    });

    // Occlusion culling behavior
    this.registerBehavior({
      id: 'occlusion-culling',
      name: 'Z-axis Occlusion Culling',
      apply: (elements: SpatialElement[], context: BehaviorContext) => {
        const viewportZ = context.viewport.z ?? 0;
        
        // Sort by z-position
        const sortedElements = [...elements].sort((a, b) => {
          const aZ = a.zPosition ?? 0;
          const bZ = b.zPosition ?? 0;
          return Math.abs(aZ - viewportZ) - Math.abs(bZ - viewportZ);
        });

        // Simple occlusion test (can be enhanced with more sophisticated algorithms)
        const visibleElements = [];
        const occludedRegions = new Set<string>();

        for (const element of sortedElements) {
          const elementKey = `${element.bounds.x},${element.bounds.y},${element.bounds.width},${element.bounds.height}`;
          
          if (!occludedRegions.has(elementKey)) {
            visibleElements.push(element);
            
            // Mark region as occluded if element is opaque and close
            const elementZ = element.zPosition ?? 0;
            const isOpaque = element.data?.styles?.opacity === undefined || element.data.styles.opacity >= 0.9;
            const isClose = Math.abs(elementZ - viewportZ) < 5;
            
            if (isOpaque && isClose) {
              occludedRegions.add(elementKey);
            }
          }
        }

        return visibleElements;
      },
      shouldApply: (context: BehaviorContext) => context.viewport.z !== undefined,
    });

    // Adaptive quality behavior
    this.registerBehavior({
      id: 'adaptive-quality',
      name: 'Adaptive Quality Based on Performance',
      apply: (elements: SpatialElement[], context: BehaviorContext) => {
        const frameRate = context.frameRate;
        let qualityLevel = 2; // High quality
        
        if (frameRate < 30) qualityLevel = 0; // Low quality
        else if (frameRate < 45) qualityLevel = 1; // Medium quality
        
        return elements.map(element => ({
          ...element,
          renderPriority: qualityLevel,
        }));
      },
      shouldApply: (context: BehaviorContext) => context.frameRate < 60,
    });
  }

  /**
   * Plugin Validation
   */
  
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

  /**
   * Event System
   */
  
  on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
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

  /**
   * Initialize and Setup
   */
  
  initialize(): void {
    this.registerBuiltInBehaviors();
  }

  /**
   * Cleanup
   */
  
  async destroy(): Promise<void> {
    // Disable and destroy all plugins
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      await this.unregisterPlugin(pluginId);
    }

    // Clear behaviors
    this.behaviors.clear();
    this.behaviorChain = [];
    
    // Clear events
    this.eventCallbacks.clear();
  }
}