/**
 * Z-axis Navigation Manager
 * Handles 3D spatial navigation and layer management for depth exploration
 */

import type {
  Viewport,
  SpatialElement,
  SpatialLayer,
  ZNavigationOptions,
  EasingFunction,
  Point3D,
} from './types.js';

interface ZNavigationState {
  currentZ: number;
  targetZ: number;
  isTransitioning: boolean;
  transitionStartTime: number;
  transitionDuration: number;
  easingFunction: EasingFunction;
  startZ: number;
}

interface LayerCullingInfo {
  layer: SpatialLayer;
  distance: number;
  opacity: number;
  shouldRender: boolean;
}

export class ZNavigationManager {
  private state: ZNavigationState;
  private layers: Map<number, SpatialLayer> = new Map();
  private eventCallbacks: Map<string, Function[]> = new Map();
  private animationFrameId: number | null = null;
  
  // Configuration
  private maxDepth = 1000;
  private minDepth = -1000;
  private defaultCullDistance = 100;
  private layerFadeDistance = 50; // Distance over which layers fade in/out

  constructor() {
    this.state = {
      currentZ: 0,
      targetZ: 0,
      isTransitioning: false,
      transitionStartTime: 0,
      transitionDuration: 1000,
      easingFunction: 'easeInOutCubic',
      startZ: 0,
    };
  }

  /**
   * Navigate to a specific Z position
   */
  async navigateToZ(options: ZNavigationOptions): Promise<void> {
    const {
      targetZ = 0,
      relativeDelta = 0,
      transitionDuration = 1000,
      easing = 'easeInOutCubic',
      onProgress,
      onComplete,
    } = options;

    let finalTargetZ = targetZ;
    if (relativeDelta !== 0) {
      finalTargetZ = this.state.currentZ + relativeDelta;
    }

    // Clamp to bounds
    finalTargetZ = Math.max(this.minDepth, Math.min(this.maxDepth, finalTargetZ));

    if (finalTargetZ === this.state.currentZ) {
      onComplete?.(this.state.currentZ);
      return;
    }

    // Cancel any existing transition
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Set up new transition
    this.state = {
      ...this.state,
      targetZ: finalTargetZ,
      isTransitioning: true,
      transitionStartTime: performance.now(),
      transitionDuration,
      easingFunction: easing,
      startZ: this.state.currentZ,
    };

    this.emit('zNavigationStart', { fromZ: this.state.startZ, toZ: finalTargetZ });

    return new Promise((resolve) => {
      const animate = () => {
        const now = performance.now();
        const elapsed = now - this.state.transitionStartTime;
        const progress = Math.min(elapsed / this.state.transitionDuration, 1);

        // Apply easing
        const easedProgress = this.applyEasing(progress, this.state.easingFunction);
        
        // Calculate current Z position
        this.state.currentZ = this.lerp(
          this.state.startZ,
          this.state.targetZ,
          easedProgress
        );

        onProgress?.(progress, this.state.currentZ);

        if (progress >= 1) {
          // Animation complete
          this.state.isTransitioning = false;
          this.animationFrameId = null;
          
          this.emit('zNavigationEnd', { z: this.state.currentZ });
          onComplete?.(this.state.currentZ);
          resolve();
        } else {
          // Continue animation
          this.animationFrameId = requestAnimationFrame(animate);
        }
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  /**
   * Quick navigation methods
   */
  async diveDeeper(distance = 10, duration = 500): Promise<void> {
    return this.navigateToZ({
      relativeDelta: distance,
      transitionDuration: duration,
      easing: 'easeOutQuart',
    });
  }

  async emergeUp(distance = 10, duration = 500): Promise<void> {
    return this.navigateToZ({
      relativeDelta: -distance,
      transitionDuration: duration,
      easing: 'easeOutBounce',
    });
  }

  async resetToSurface(duration = 1000): Promise<void> {
    return this.navigateToZ({
      targetZ: 0,
      transitionDuration: duration,
      easing: 'easeInOutElastic',
    });
  }

  /**
   * Layer management
   */
  addLayer(layer: SpatialLayer): void {
    this.layers.set(layer.zIndex, layer);
  }

  removeLayer(zIndex: number): void {
    this.layers.delete(zIndex);
  }

  getLayer(zIndex: number): SpatialLayer | undefined {
    return this.layers.get(zIndex);
  }

  getAllLayers(): SpatialLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Get visible layers based on current Z position
   */
  getVisibleLayers(): LayerCullingInfo[] {
    const currentZ = this.state.currentZ;
    const cullingInfo: LayerCullingInfo[] = [];

    for (const layer of this.layers.values()) {
      const distance = Math.abs(layer.zIndex - currentZ);
      const cullDistance = layer.cullDistance ?? this.defaultCullDistance;
      
      let opacity = layer.opacity ?? 1.0;
      let shouldRender = layer.visible && distance <= cullDistance;

      // Apply distance-based fade
      if (shouldRender && distance > cullDistance - this.layerFadeDistance) {
        const fadeRatio = (cullDistance - distance) / this.layerFadeDistance;
        opacity *= Math.max(0, Math.min(1, fadeRatio));
      }

      // Hide layers that are too transparent
      if (opacity < 0.01) {
        shouldRender = false;
      }

      cullingInfo.push({
        layer,
        distance,
        opacity,
        shouldRender,
      });
    }

    // Sort by distance (closest first for proper z-ordering)
    return cullingInfo.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Filter elements based on Z position and visibility
   */
  filterElementsByDepth(elements: SpatialElement[]): SpatialElement[] {
    const currentZ = this.state.currentZ;
    const visibleLayerIndices = new Set(
      this.getVisibleLayers()
        .filter(info => info.shouldRender)
        .map(info => info.layer.zIndex)
    );

    return elements.filter(element => {
      // If element has explicit z-position, check against current viewport
      if (element.zPosition !== undefined) {
        const distance = Math.abs(element.zPosition - currentZ);
        return distance <= this.defaultCullDistance;
      }

      // If element doesn't have z-position, check if its layer is visible
      const elementLayer = this.findElementLayer(element);
      return elementLayer ? visibleLayerIndices.has(elementLayer.zIndex) : true;
    });
  }

  /**
   * Get 3D position for an element
   */
  getElementPosition3D(element: SpatialElement): Point3D {
    return {
      x: element.position.x,
      y: element.position.y,
      z: element.zPosition ?? this.findElementLayer(element)?.zIndex ?? 0,
    };
  }

  /**
   * Update viewport to include Z information
   */
  updateViewportWithZ(viewport: Viewport): Viewport {
    return {
      ...viewport,
      z: this.state.currentZ,
    };
  }

  /**
   * Current state accessors
   */
  getCurrentZ(): number {
    return this.state.currentZ;
  }

  isNavigating(): boolean {
    return this.state.isTransitioning;
  }

  getNavigationProgress(): number {
    if (!this.state.isTransitioning) return 1;
    
    const elapsed = performance.now() - this.state.transitionStartTime;
    return Math.min(elapsed / this.state.transitionDuration, 1);
  }

  /**
   * Configuration
   */
  setDepthBounds(min: number, max: number): void {
    this.minDepth = min;
    this.maxDepth = max;
    
    // Clamp current position if needed
    this.state.currentZ = Math.max(min, Math.min(max, this.state.currentZ));
  }

  setDefaultCullDistance(distance: number): void {
    this.defaultCullDistance = distance;
  }

  setLayerFadeDistance(distance: number): void {
    this.layerFadeDistance = distance;
  }

  /**
   * Event system
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
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Utility functions
   */
  private findElementLayer(element: SpatialElement): SpatialLayer | undefined {
    for (const layer of this.layers.values()) {
      if (layer.elements.includes(element)) {
        return layer;
      }
    }
    return undefined;
  }

  private lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  private applyEasing(progress: number, easing: EasingFunction): number {
    switch (easing) {
      case 'linear':
        return progress;
      
      case 'easeInOutCubic':
        return progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      case 'easeOutQuart':
        return 1 - Math.pow(1 - progress, 4);
      
      case 'easeOutExpo':
        return progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      case 'easeInOutBack': {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return progress < 0.5
          ? (Math.pow(2 * progress, 2) * ((c2 + 1) * 2 * progress - c2)) / 2
          : (Math.pow(2 * progress - 2, 2) * ((c2 + 1) * (progress * 2 - 2) + c2) + 2) / 2;
      }
      
      case 'easeInOutElastic': {
        const c5 = (2 * Math.PI) / 4.5;
        return progress === 0
          ? 0
          : progress === 1
          ? 1
          : progress < 0.5
          ? -(Math.pow(2, 20 * progress - 10) * Math.sin((20 * progress - 11.125) * c5)) / 2
          : (Math.pow(2, -20 * progress + 10) * Math.sin((20 * progress - 11.125) * c5)) / 2 + 1;
      }
      
      case 'easeOutBounce': {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (progress < 1 / d1) {
          return n1 * progress * progress;
        } else if (progress < 2 / d1) {
          return n1 * (progress -= 1.5 / d1) * progress + 0.75;
        } else if (progress < 2.5 / d1) {
          return n1 * (progress -= 2.25 / d1) * progress + 0.9375;
        } else {
          return n1 * (progress -= 2.625 / d1) * progress + 0.984375;
        }
      }
      
      default:
        return progress;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.layers.clear();
    this.eventCallbacks.clear();
  }
}