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
  ZNavigationOptions,
  SpatialLayer,
} from './types.js';
import type { BoundingBox } from '@fir/penpot-parser';
import { LODManager } from './lod-manager.js';
import { TransitionManager } from './transition-manager.js';
import { ZNavigationManager } from './z-navigation-manager.js';
import { PluginManager } from './plugin-manager.js';

interface RBushItem extends BoundingBox {
  element: SpatialElement;
}

export class SpatialEngine {
  private deck: Deck | null = null;
  private spatialIndex: RBush<RBushItem>;
  private viewport: Viewport;
  private world: SpatialWorld | null = null;
  private transitionManager: TransitionManager;
  private lodManager: LODManager;
  private zNavigationManager: ZNavigationManager;
  private pluginManager: PluginManager;
  private eventListeners: Map<keyof EventMap, Function[]> = new Map();
  private frameStartTime = 0;
  private performanceMetrics: PerformanceMetrics;
  private is3DEnabled = false;

  constructor(container: HTMLElement, options: SpatialEngineOptions = {}) {
    this.spatialIndex = new RBush();
    this.is3DEnabled = options.enable3D ?? false;
    this.viewport = {
      x: options.initialViewport?.x ?? 0,
      y: options.initialViewport?.y ?? 0,
      z: this.is3DEnabled ? (options.initialViewport?.z ?? 0) : undefined,
      zoom: options.initialViewport?.zoom ?? 1,
      width: options.initialViewport?.width ?? container.clientWidth,
      height: options.initialViewport?.height ?? container.clientHeight,
    };

    this.transitionManager = new TransitionManager();
    this.lodManager = new LODManager();
    this.zNavigationManager = new ZNavigationManager();
    this.pluginManager = new PluginManager(this);
    this.performanceMetrics = this.initializePerformanceMetrics();

    // Configure Z-navigation bounds
    if (this.is3DEnabled) {
      this.zNavigationManager.setDepthBounds(
        options.minDepth ?? -1000,
        options.maxDepth ?? 1000
      );
    }

    this.initializeDeckGL(container, options);
    this.setupEventForwarding();
    this.pluginManager.initialize();
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
      ...options.deckGLOptions,
    });
  }

  loadWorld(world: SpatialWorld): void {
    this.world = world;

    this.spatialIndex.clear();
    const indexItems: RBushItem[] = world.elements.map(element => ({
      minX: element.bounds.x,
      minY: element.bounds.y,
      maxX: element.bounds.x + element.bounds.width,
      maxY: element.bounds.y + element.bounds.height,
      element,
    }));

    this.spatialIndex.load(indexItems);

    this.setViewport({
      x: world.bounds.x + world.bounds.width / 2,
      y: world.bounds.y + world.bounds.height / 2,
      zoom: this.calculateOverviewZoom(world.bounds),
      width: this.viewport.width,
      height: this.viewport.height,
    });
  }

  private calculateOverviewZoom(bounds: BoundingBox): number {
    const padding = 100;
    const zoomX = (this.viewport.width - padding) / bounds.width;
    const zoomY = (this.viewport.height - padding) / bounds.height;
    return Math.min(zoomX, zoomY, 1);
  }

  private handleViewportChange(newViewport: Viewport): void {
    this.viewport = newViewport;

    // Update Z navigation manager if 3D is enabled
    if (this.is3DEnabled && newViewport.z !== undefined) {
      // This would typically be driven by the ZNavigationManager,
      // but we sync the viewport here for consistency
    }

    let visibleElements = this.getVisibleElements();
    
    // Apply Z-axis filtering if 3D is enabled
    if (this.is3DEnabled) {
      visibleElements = this.zNavigationManager.filterElementsByDepth(visibleElements);
    }
    
    // Apply plugin behaviors
    const behaviorContext = {
      viewport: newViewport,
      timestamp: performance.now(),
      frameRate: this.performanceMetrics.rendering.frameRate,
    };
    visibleElements = this.pluginManager.applyBehaviors(visibleElements, behaviorContext);
    
    const lodElements = this.lodManager.applyLOD(visibleElements, newViewport.zoom);

    this.updateLayers(lodElements);
    this.emit('viewportChange', newViewport);
    
    // Notify plugins
    this.pluginManager.notifyViewportChange(newViewport);
  }

  private getVisibleElements(): SpatialElement[] {
    const viewportBounds = this.getViewportBounds();

    const results = this.spatialIndex.search({
      minX: viewportBounds.x,
      minY: viewportBounds.y,
      maxX: viewportBounds.x + viewportBounds.width,
      maxY: viewportBounds.y + viewportBounds.height,
    });

    return results.map(result => result.element);
  }

  private getViewportBounds(): BoundingBox {
    const worldWidth = this.viewport.width / this.viewport.zoom;
    const worldHeight = this.viewport.height / this.viewport.zoom;

    return {
      x: this.viewport.x - worldWidth / 2,
      y: this.viewport.y - worldHeight / 2,
      width: worldWidth,
      height: worldHeight,
    };
  }

  async flyTo(
    target: string | SpatialElement | BoundingBox,
    options: TransitionOptions = {}
  ): Promise<void> {
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
      (viewport: Viewport) => this.setViewport(viewport)
    );
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

  private setViewport(viewport: Viewport): void {
    this.deck?.setProps({
      viewState: {
        longitude: viewport.x,
        latitude: viewport.y,
        zoom: Math.log2(viewport.zoom),
        pitch: 0,
        bearing: 0,
      },
    });
  }

  private updateLayers(elements: SpatialElement[]): void {
    const layers = this.createDeckGLLayers(elements);
    this.deck?.setProps({ layers });
  }

  private createDeckGLLayers(elements: SpatialElement[]): any[] {
    const layers: any[] = [];
    const elementsByType = this.groupElementsByType(elements);

    if (elementsByType.rectangle?.length > 0) {
      layers.push(
        new PolygonLayer({
          id: 'rectangles',
          data: elementsByType.rectangle,
          getPolygon: (d: SpatialElement) => this.getRectanglePolygon(d.bounds),
          getFillColor: (d: SpatialElement) => this.getElementColor(d),
          getLineColor: (d: SpatialElement) => this.getElementStroke(d),
          getLineWidth: (d: SpatialElement) => this.getElementStrokeWidth(d),
          pickable: true,
          onClick: (info: any) => this.handleElementClick(info.object),
        })
      );
    }

    if (elementsByType.text?.length > 0) {
      layers.push(
        new TextLayer({
          id: 'text-elements',
          data: elementsByType.text,
          getPosition: (d: SpatialElement) => [d.bounds.x, d.bounds.y],
          getText: (d: SpatialElement) => d.data?.text || d.id,
          getSize: (d: SpatialElement) => this.getTextSize(d),
          getColor: (d: SpatialElement) => this.getTextColor(d),
          getAngle: 0,
          getTextAnchor: 'start',
          getAlignmentBaseline: 'top',
          pickable: true,
          onClick: (info: any) => this.handleElementClick(info.object),
        })
      );
    }

    return layers;
  }

  private groupElementsByType(elements: SpatialElement[]): Record<string, SpatialElement[]> {
    return elements.reduce((groups, element) => {
      const type = element.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(element);
      return groups;
    }, {} as Record<string, SpatialElement[]>);
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

  private hexToRGBA(hex: string): [number, number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  }

  private handleElementClick(element: SpatialElement): void {
    this.emit('elementClick', element);
    
    // Notify plugins of element interaction
    this.pluginManager.notifyElementInteraction(element, 'click');

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

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Z-axis Navigation Methods
   */
  
  async navigateToZ(options: ZNavigationOptions): Promise<void> {
    if (!this.is3DEnabled) {
      console.warn('3D navigation is not enabled');
      return;
    }
    
    return this.zNavigationManager.navigateToZ({
      ...options,
      onProgress: (progress, currentZ) => {
        // Update viewport with new Z position
        this.viewport = { ...this.viewport, z: currentZ };
        this.handleViewportChange(this.viewport);
        options.onProgress?.(progress, currentZ);
      },
      onComplete: (finalZ) => {
        this.emit('zNavigationEnd', { z: finalZ });
        options.onComplete?.(finalZ);
      },
    });
  }
  
  async diveDeeper(distance = 10, duration = 500): Promise<void> {
    return this.zNavigationManager.diveDeeper(distance, duration);
  }
  
  async emergeUp(distance = 10, duration = 500): Promise<void> {
    return this.zNavigationManager.emergeUp(distance, duration);
  }
  
  async resetToSurface(duration = 1000): Promise<void> {
    return this.zNavigationManager.resetToSurface(duration);
  }
  
  getCurrentZ(): number {
    return this.zNavigationManager.getCurrentZ();
  }
  
  /**
   * Layer Management for 3D
   */
  
  addSpatialLayer(layer: SpatialLayer): void {
    this.zNavigationManager.addLayer(layer);
  }
  
  removeSpatialLayer(zIndex: number): void {
    this.zNavigationManager.removeLayer(zIndex);
  }
  
  getSpatialLayer(zIndex: number): SpatialLayer | undefined {
    return this.zNavigationManager.getLayer(zIndex);
  }
  
  getAllSpatialLayers(): SpatialLayer[] {
    return this.zNavigationManager.getAllLayers();
  }
  
  /**
   * Plugin Management
   */
  
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }
  
  getZNavigationManager(): ZNavigationManager {
    return this.zNavigationManager;
  }
  
  is3D(): boolean {
    return this.is3DEnabled;
  }

  private updatePerformanceMetrics(): void {
    const now = performance.now();
    const frameTime = now - this.frameStartTime;

    this.performanceMetrics.rendering.frameTime = frameTime;
    this.performanceMetrics.rendering.frameRate = 1000 / frameTime;

    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.performanceMetrics.memory.jsHeapSize = memory.usedJSHeapSize;
      this.performanceMetrics.memory.totalHeapSize = memory.totalJSHeapSize;
    }

    this.emit('performanceUpdate', this.performanceMetrics);
  }

  private setupEventForwarding(): void {
    // Forward Z-navigation events
    this.zNavigationManager.on('zNavigationStart', (data) => {
      this.emit('zNavigationStart', data);
    });
    
    this.zNavigationManager.on('zNavigationEnd', (data) => {
      this.emit('zNavigationEnd', data);
    });
  }

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

  destroy(): void {
    this.transitionManager.cancel();
    this.zNavigationManager.destroy();
    this.pluginManager.destroy();
    this.deck?.finalize();
    this.spatialIndex.clear();
    this.eventListeners.clear();
  }
}