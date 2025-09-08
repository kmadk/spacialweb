import { Deck } from '@deck.gl/core';
import { PolygonLayer, TextLayer, BitmapLayer } from '@deck.gl/layers';
import RBush from 'rbush';
import type {
  Viewport,
  SpatialElement,
  SpatialWorld,
  SpatialEngineOptions,
  TransitionOptions,
  PerformanceMetrics,
  EventMap,
} from './types.js';
import type { BoundingBox } from '@fir/penpot-parser';
import { LODManager } from './lod-manager.js';
import { TransitionManager } from './transition-manager.js';
import { ViewportCuller } from './performance/viewport-culling.js';
import { viewportPool, boundingBoxPool } from './performance/object-pool.js';
import { globalRenderScheduler, type RenderTask } from './performance/render-scheduler.js';
import { FlowChoreographer, type PenpotFlow, type CinematicSequence } from './cinematics/flow-choreographer.js';

interface RBushItem extends BoundingBox {
  element: SpatialElement;
}

/**
 * Optimized spatial engine with advanced performance features
 */
export class OptimizedSpatialEngine {
  private deck: Deck | null = null;
  private spatialIndex: RBush<RBushItem>;
  private viewport: Viewport;
  private world: SpatialWorld | null = null;
  private transitionManager: TransitionManager;
  private lodManager: LODManager;
  private viewportCuller: ViewportCuller;
  private flowChoreographer: FlowChoreographer;
  private eventListeners: Map<keyof EventMap, Function[]> = new Map();
  
  // Cinematic flow state
  private cinematicConnections = new Map<string, CinematicSequence>();
  private spatialLayout = new Map<string, { x: number; y: number; bounds: any }>();
  
  // Performance tracking
  private frameStartTime = 0;
  private performanceMetrics: PerformanceMetrics;
  private layerCache = new Map<string, any>();
  private lastRenderHash = '';
  
  // Optimization flags
  private enableIncrementalUpdates = true;
  private enableLayerCaching = true;
  private enableAsyncProcessing = true;

  constructor(container: HTMLElement, options: SpatialEngineOptions = {}) {
    this.spatialIndex = new RBush();
    this.viewport = {
      x: options.initialViewport?.x ?? 0,
      y: options.initialViewport?.y ?? 0,
      zoom: options.initialViewport?.zoom ?? 1,
      width: options.initialViewport?.width ?? container.clientWidth,
      height: options.initialViewport?.height ?? container.clientHeight,
    };

    this.transitionManager = new TransitionManager();
    this.lodManager = new LODManager();
    this.viewportCuller = new ViewportCuller();
    this.flowChoreographer = new FlowChoreographer();
    this.performanceMetrics = this.initializePerformanceMetrics();

    this.initializeDeckGL(container, options);
  }

  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      rendering: {
        frameTime: 0,
        frameRate: 0,
        droppedFrames: 0,
        renderTime: 0,
        culledElements: 0,
      },
      memory: {
        jsHeapSize: 0,
        totalHeapSize: 0,
        elementCount: 0,
        assetMemory: 0,
      },
      interactions: {
        transitionTime: 0,
        responseTime: 0,
        clickAccuracy: 0,
      },
    };
  }

  private initializeDeckGL(container: HTMLElement, options: SpatialEngineOptions): void {
    this.deck = new Deck({
      container,
      initialViewState: {
        longitude: this.viewport.x,
        latitude: this.viewport.y,
        zoom: Math.log2(this.viewport.zoom),
        pitch: 0,
        bearing: 0,
      },
      controller: {
        scrollZoom: { speed: 0.01, smooth: true },
        doubleClickZoom: true,
        touchZoom: true,
        minZoom: options.minZoom ?? -10,
        maxZoom: options.maxZoom ?? 10,
      },
      onViewStateChange: ({ viewState }) => {
        this.handleViewportChange({
          x: viewState.longitude,
          y: viewState.latitude,
          zoom: Math.pow(2, viewState.zoom),
          width: viewState.width || this.viewport.width,
          height: viewState.height || this.viewport.height,
        });
      },
      onBeforeRender: () => {
        this.frameStartTime = performance.now();
      },
      onAfterRender: () => {
        this.updatePerformanceMetrics();
      },
      // Optimization settings
      useDevicePixels: false, // Improves performance on high-DPI displays
      ...options.deckGLOptions,
    });
  }

  loadWorld(world: SpatialWorld): void {
    this.world = world;

    // Build spatial index with optimization
    this.spatialIndex.clear();
    const indexItems: RBushItem[] = world.elements.map(element => ({
      minX: element.bounds.x,
      minY: element.bounds.y,
      maxX: element.bounds.x + element.bounds.width,
      maxY: element.bounds.y + element.bounds.height,
      element,
    }));

    // Batch load for better performance
    this.spatialIndex.load(indexItems);

    // Set optimal initial viewport
    const optimalViewport = this.calculateOptimalViewport(world.bounds);
    this.setViewport(optimalViewport);

    // Clear caches
    this.layerCache.clear();
    this.viewportCuller.clearCache();

    // Update metrics
    this.performanceMetrics.memory.elementCount = world.elements.length;
  }

  private handleViewportChange(newViewport: Viewport): void {
    this.viewport = newViewport;

    // Schedule viewport update as high-priority task
    const updateTask: RenderTask = {
      id: 'viewport-update',
      execute: () => this.performViewportUpdate(newViewport),
      priority: 1000,
      estimatedTime: 5, // ms
    };

    globalRenderScheduler.scheduleImmediate(updateTask);
    this.emit('viewportChange', newViewport);
  }

  private performViewportUpdate(viewport: Viewport): void {
    // Get visible elements with culling
    const visibleElements = this.getVisibleElementsOptimized();
    
    // Apply LOD
    const lodElements = this.lodManager.applyLOD(visibleElements.visible, viewport.zoom);

    // Schedule layer update if significant changes
    const renderHash = this.calculateRenderHash(lodElements, viewport);
    if (renderHash !== this.lastRenderHash || !this.enableIncrementalUpdates) {
      const layerUpdateTask: RenderTask = {
        id: 'layer-update',
        execute: () => this.updateLayersOptimized(lodElements),
        priority: 900,
        estimatedTime: 8, // ms
      };

      globalRenderScheduler.schedule(layerUpdateTask);
      this.lastRenderHash = renderHash;
    }

    // Update performance metrics
    this.performanceMetrics.rendering.culledElements = visibleElements.stats.culledElements;
  }

  private getVisibleElementsOptimized(): {
    visible: SpatialElement[];
    stats: any;
  } {
    if (!this.world) return { visible: [], stats: {} };

    // Use optimized viewport culler
    return this.viewportCuller.cullElements(this.world.elements, this.viewport);
  }

  private calculateRenderHash(elements: SpatialElement[], viewport: Viewport): string {
    // Create hash for significant rendering changes only
    const elementIds = elements.slice(0, 100).map(e => e.id).join(','); // Limit for performance
    const zoomBucket = Math.floor(Math.log2(viewport.zoom) * 4); // Group similar zoom levels
    return `${elementIds}-${zoomBucket}`;
  }

  private updateLayersOptimized(elements: SpatialElement[]): void {
    if (!this.enableLayerCaching) {
      this.updateLayers(elements);
      return;
    }

    const layers: any[] = [];
    const elementsByType = this.groupElementsByType(elements);

    // Use cached layers when possible
    for (const [type, typeElements] of Object.entries(elementsByType)) {
      const cacheKey = `${type}-${typeElements.length}-${this.viewport.zoom}`;
      let layer = this.layerCache.get(cacheKey);

      if (!layer) {
        layer = this.createLayerForType(type, typeElements);
        this.layerCache.set(cacheKey, layer);
      }

      if (layer) {
        layers.push(layer);
      }
    }

    // Limit layer cache size
    if (this.layerCache.size > 50) {
      const oldestKeys = Array.from(this.layerCache.keys()).slice(0, 10);
      oldestKeys.forEach(key => this.layerCache.delete(key));
    }

    this.deck?.setProps({ layers });
  }

  private createLayerForType(type: string, elements: SpatialElement[]): any {
    switch (type) {
      case 'rectangle':
        return new PolygonLayer({
          id: `rectangles-${Date.now()}`,
          data: elements,
          getPolygon: (d: SpatialElement) => this.getRectanglePolygon(d.bounds),
          getFillColor: (d: SpatialElement) => this.getElementColor(d),
          getLineColor: (d: SpatialElement) => this.getElementStroke(d),
          getLineWidth: (d: SpatialElement) => this.getElementStrokeWidth(d),
          pickable: true,
          onClick: (info: any) => this.handleElementClick(info.object),
          updateTriggers: {
            getFillColor: this.viewport.zoom,
            getLineColor: this.viewport.zoom,
          },
        });

      case 'text':
        return new TextLayer({
          id: `text-${Date.now()}`,
          data: elements,
          getPosition: (d: SpatialElement) => [d.bounds.x, d.bounds.y],
          getText: (d: SpatialElement) => this.getElementText(d),
          getSize: (d: SpatialElement) => this.getTextSize(d),
          getColor: (d: SpatialElement) => this.getTextColor(d),
          getAngle: 0,
          getTextAnchor: 'start',
          getAlignmentBaseline: 'top',
          pickable: true,
          onClick: (info: any) => this.handleElementClick(info.object),
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 'normal',
        });

      case 'image':
        return new BitmapLayer({
          id: `images-${Date.now()}`,
          data: elements,
          image: (d: SpatialElement) => this.getElementImage(d),
          bounds: (d: SpatialElement) => [
            d.bounds.x,
            d.bounds.y,
            d.bounds.x + d.bounds.width,
            d.bounds.y + d.bounds.height,
          ],
          pickable: true,
          onClick: (info: any) => this.handleElementClick(info.object),
        });

      default:
        return null;
    }
  }

  // Legacy methods for compatibility
  private updateLayers(elements: SpatialElement[]): void {
    const layers = this.createDeckGLLayers(elements);
    this.deck?.setProps({ layers });
  }

  private createDeckGLLayers(elements: SpatialElement[]): any[] {
    const layers: any[] = [];
    const elementsByType = this.groupElementsByType(elements);

    if (elementsByType.rectangle?.length > 0) {
      layers.push(this.createLayerForType('rectangle', elementsByType.rectangle));
    }

    if (elementsByType.text?.length > 0) {
      layers.push(this.createLayerForType('text', elementsByType.text));
    }

    if (elementsByType.image?.length > 0) {
      layers.push(this.createLayerForType('image', elementsByType.image));
    }

    return layers.filter(Boolean);
  }

  async flyTo(
    target: string | SpatialElement | BoundingBox,
    options: TransitionOptions = {}
  ): Promise<void> {
    const startTime = performance.now();
    let targetViewport: Viewport;

    if (typeof target === 'string') {
      const element = this.findElementById(target);
      if (!element) throw new Error(`Element ${target} not found`);
      targetViewport = this.calculateOptimalViewport(element.bounds);
    } else if ('element' in target || 'bounds' in target) {
      const bounds = 'bounds' in target ? target.bounds : target;
      targetViewport = this.calculateOptimalViewport(bounds);
    } else {
      targetViewport = this.calculateOptimalViewport(target);
    }

    await this.transitionManager.animateToViewport(
      this.viewport,
      targetViewport,
      options,
      (viewport: Viewport) => this.setViewportOptimized(viewport)
    );

    // Update performance metrics
    this.performanceMetrics.interactions.transitionTime = performance.now() - startTime;
  }

  private setViewportOptimized(viewport: Viewport): void {
    // Use pooled viewport object to reduce allocations
    const pooledViewport = viewportPool.acquire();
    pooledViewport.set(viewport.x, viewport.y, viewport.zoom, viewport.width, viewport.height);

    this.deck?.setProps({
      viewState: {
        longitude: pooledViewport.x,
        latitude: pooledViewport.y,
        zoom: Math.log2(pooledViewport.zoom),
        pitch: 0,
        bearing: 0,
      },
    });

    viewportPool.release(pooledViewport);
  }

  private calculateOptimalViewport(bounds: BoundingBox): Viewport {
    const padding = 100;
    const zoomX = (this.viewport.width - padding) / bounds.width;
    const zoomY = (this.viewport.height - padding) / bounds.height;
    const zoom = Math.min(zoomX, zoomY, 10);

    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
      zoom,
      width: this.viewport.width,
      height: this.viewport.height,
    };
  }

  // Optimized helper methods
  private getElementText(element: SpatialElement): string {
    return element.data?.text || element.id;
  }

  private groupElementsByType(elements: SpatialElement[]): Record<string, SpatialElement[]> {
    const groups: Record<string, SpatialElement[]> = {};
    
    for (const element of elements) {
      const type = element.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(element);
    }
    
    return groups;
  }

  private getRectanglePolygon(bounds: BoundingBox): number[][] {
    return [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x + bounds.width, bounds.y + bounds.height],
      [bounds.x, bounds.y + bounds.height],
      [bounds.x, bounds.y],
    ];
  }

  private getElementColor(element: SpatialElement): [number, number, number, number] {
    const color = element.data?.styles?.fill?.color || '#000000';
    return this.hexToRGBA(color);
  }

  private getElementStroke(element: SpatialElement): [number, number, number, number] {
    const color = element.data?.styles?.stroke?.color || '#000000';
    return this.hexToRGBA(color);
  }

  private getElementStrokeWidth(element: SpatialElement): number {
    return element.data?.styles?.stroke?.width || 1;
  }

  private getTextSize(element: SpatialElement): number {
    return element.data?.styles?.typography?.fontSize || 16;
  }

  private getTextColor(element: SpatialElement): [number, number, number, number] {
    const color = element.data?.styles?.typography?.color || '#000000';
    return this.hexToRGBA(color);
  }

  private getElementImage(element: SpatialElement): string {
    return element.data?.src || '/placeholder.jpg';
  }

  private hexToRGBA(hex: string): [number, number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  }

  private handleElementClick(element: SpatialElement): void {
    this.emit('elementClick', element);

    if (element.data?.interactions) {
      this.processInteractions(element.data.interactions, element);
    }
  }

  private processInteractions(interactions: any[], element: SpatialElement): void {
    for (const interaction of interactions) {
      if (interaction.trigger === 'click') {
        this.executeAction(interaction.action, element);
      }
    }
  }

  private executeAction(action: any, element: SpatialElement): void {
    switch (action.type) {
      case 'navigate':
        if (action.target) {
          this.flyTo(action.target);
        }
        break;

      case 'external-link':
        if (action.url) {
          window.open(action.url, '_blank');
        }
        break;

      case 'custom':
        this.emit('customAction', { action, element });
        break;
    }
  }

  findElementById(id: string): SpatialElement | null {
    if (!this.world) return null;

    // Use optimized search with early termination
    const findInElements = (elements: SpatialElement[]): SpatialElement | null => {
      for (const element of elements) {
        if (element.id === id) return element;
        if (element.children) {
          const found = findInElements(element.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInElements(this.world.elements);
  }

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  private setViewport(viewport: Viewport): void {
    this.setViewportOptimized(viewport);
  }

  getPerformanceMetrics(): PerformanceMetrics {
    // Add scheduler stats
    const schedulerStats = globalRenderScheduler.getStats();
    const cullingStats = this.viewportCuller.getStats();

    return {
      ...this.performanceMetrics,
      rendering: {
        ...this.performanceMetrics.rendering,
        culledElements: cullingStats.culledElements,
      },
      scheduler: schedulerStats,
      culling: cullingStats,
    };
  }

  private updatePerformanceMetrics(): void {
    const now = performance.now();
    const frameTime = now - this.frameStartTime;

    this.performanceMetrics.rendering.frameTime = frameTime;
    this.performanceMetrics.rendering.frameRate = 1000 / frameTime;

    // Check for dropped frames (>20ms = dropped frame at 60fps)
    if (frameTime > 20) {
      this.performanceMetrics.rendering.droppedFrames++;
    }

    // Memory metrics (if available)
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.performanceMetrics.memory.jsHeapSize = memory.usedJSHeapSize;
      this.performanceMetrics.memory.totalHeapSize = memory.totalJSHeapSize;
    }

    this.emit('performanceUpdate', this.performanceMetrics);
  }

  // Event system
  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  // Optimization controls
  setOptimizationLevel(level: 'performance' | 'balanced' | 'quality'): void {
    switch (level) {
      case 'performance':
        this.enableIncrementalUpdates = true;
        this.enableLayerCaching = true;
        this.enableAsyncProcessing = true;
        break;
      case 'balanced':
        this.enableIncrementalUpdates = true;
        this.enableLayerCaching = true;
        this.enableAsyncProcessing = false;
        break;
      case 'quality':
        this.enableIncrementalUpdates = false;
        this.enableLayerCaching = false;
        this.enableAsyncProcessing = false;
        break;
    }
  }

  /**
   * Load and choreograph Penpot flows into spatial cinematic sequences
   */
  choreographFlows(flows: PenpotFlow[]): void {
    if (!this.world) {
      throw new Error('World must be loaded before choreographing flows');
    }

    const result = this.flowChoreographer.choreographFlows(flows, this.world.elements);
    this.cinematicConnections = result.cinematicConnections;
    this.spatialLayout = result.spatialLayout;

    // Update element positions based on choreographed layout
    this.applySpatiallayout();

    this.emit('flowsChoreographed', { flows, connections: this.cinematicConnections });
  }

  /**
   * Execute a cinematic transition between connected elements
   */
  async executeCinematicTransition(
    connectionId: string,
    options: {
      skipIntro?: boolean;
      fastMode?: boolean;
      narrativeVoice?: boolean;
    } = {}
  ): Promise<void> {
    if (!this.cinematicConnections.has(connectionId)) {
      throw new Error(`No cinematic connection found for ID: ${connectionId}`);
    }

    // Add cinematic effects support to the engine
    const originalSetRenderEffect = this.setRenderEffect?.bind(this) || (() => {});
    const originalHighlightElement = this.highlightElement?.bind(this) || (() => {});
    
    // Temporarily add these methods for the choreographer
    (this as any).setRenderEffect = (effect: string, value: number) => {
      // Apply effects through deck.gl layers
      this.applyCinematicEffect(effect, value);
    };
    
    (this as any).highlightElement = (elementId: string, options: any) => {
      this.highlightElementCinematically(elementId, options);
    };

    await this.flowChoreographer.executeTransition(connectionId, this, options);
    
    // Restore original methods
    (this as any).setRenderEffect = originalSetRenderEffect;
    (this as any).highlightElement = originalHighlightElement;
  }

  /**
   * Get all available cinematic connections
   */
  getCinematicConnections(): Map<string, CinematicSequence> {
    return new Map(this.cinematicConnections);
  }

  /**
   * Get the spatial layout generated by flow choreography
   */
  getSpatialLayout(): Map<string, { x: number; y: number; bounds: any }> {
    return new Map(this.spatialLayout);
  }

  /**
   * Apply spatial layout to elements
   */
  private applySpatiallayout(): void {
    if (!this.world || this.spatialLayout.size === 0) return;

    for (const element of this.world.elements) {
      const layout = this.spatialLayout.get(element.id);
      if (layout) {
        // Update element bounds to match choreographed layout
        element.bounds = {
          ...element.bounds,
          x: layout.x,
          y: layout.y,
        };
      }
    }

    // Rebuild spatial index with new positions
    this.spatialIndex.clear();
    const indexItems: RBushItem[] = this.world.elements.map(element => ({
      minX: element.bounds.x,
      minY: element.bounds.y,
      maxX: element.bounds.x + element.bounds.width,
      maxY: element.bounds.y + element.bounds.height,
      element,
    }));
    this.spatialIndex.load(indexItems);

    // Force re-render with new positions
    this.performViewportUpdate(this.viewport);
  }

  /**
   * Apply cinematic effects through deck.gl
   */
  private applyCinematicEffect(effect: string, value: number): void {
    const currentLayers = this.deck?.props.layers || [];
    
    // Apply effect to all layers based on effect type
    switch (effect) {
      case 'blur':
        // Reduce layer opacity for blur effect
        currentLayers.forEach((layer: any) => {
          if (layer && typeof layer.updateProps === 'function') {
            layer.updateProps({ opacity: Math.max(0.1, 1 - value) });
          }
        });
        break;
      
      case 'vignette':
        // Could add a vignette overlay layer
        break;
      
      case 'spotlight':
        // Could add a spotlight masking layer
        break;
    }
  }

  /**
   * Highlight element cinematically
   */
  private highlightElementCinematically(elementId: string, options: any): void {
    const element = this.findElementById(elementId);
    if (!element) return;

    // Create a temporary highlight layer
    const highlightLayer = new PolygonLayer({
      id: `highlight-${elementId}-${Date.now()}`,
      data: [element],
      getPolygon: (d: SpatialElement) => this.getRectanglePolygon(d.bounds),
      getFillColor: [255, 255, 0, 50], // Yellow highlight
      getLineColor: [255, 255, 0, 200],
      getLineWidth: 3,
      pickable: false,
    });

    // Add highlight layer temporarily
    const currentLayers = this.deck?.props.layers || [];
    this.deck?.setProps({ layers: [...currentLayers, highlightLayer] });

    // Remove highlight after duration
    setTimeout(() => {
      const layersWithoutHighlight = (this.deck?.props.layers || [])
        .filter((layer: any) => !layer.id?.startsWith(`highlight-${elementId}`));
      this.deck?.setProps({ layers: layersWithoutHighlight });
    }, options.duration || 1000);
  }

  destroy(): void {
    this.transitionManager.cancel();
    this.deck?.finalize();
    this.spatialIndex.clear();
    this.eventListeners.clear();
    this.layerCache.clear();
    this.viewportCuller.clearCache();
    
    // Release pooled objects
    viewportPool.releaseAll();
    boundingBoxPool.releaseAll();
  }
}