import type { SpatialElement, Viewport, BoundingBox } from '../types.js';

export interface CullingStats {
  totalElements: number;
  visibleElements: number;
  culledElements: number;
  cullingRatio: number;
  lastUpdateTime: number;
}

export class ViewportCuller {
  private stats: CullingStats = {
    totalElements: 0,
    visibleElements: 0,
    culledElements: 0,
    cullingRatio: 0,
    lastUpdateTime: 0,
  };

  private frustumCache = new Map<string, boolean>();
  private lastViewportHash = '';

  /**
   * Optimized viewport culling with frustum caching
   */
  cullElements(elements: SpatialElement[], viewport: Viewport): {
    visible: SpatialElement[];
    stats: CullingStats;
  } {
    const startTime = performance.now();
    const viewportHash = this.getViewportHash(viewport);
    
    // Clear cache if viewport changed significantly
    if (viewportHash !== this.lastViewportHash) {
      this.frustumCache.clear();
      this.lastViewportHash = viewportHash;
    }

    const frustum = this.calculateFrustum(viewport);
    const visible: SpatialElement[] = [];
    let culledCount = 0;

    for (const element of elements) {
      const cacheKey = `${element.id}-${viewportHash}`;
      let isVisible = this.frustumCache.get(cacheKey);

      if (isVisible === undefined) {
        isVisible = this.isElementInFrustum(element, frustum, viewport);
        this.frustumCache.set(cacheKey, isVisible);
      }

      if (isVisible) {
        visible.push(element);
      } else {
        culledCount++;
      }
    }

    this.stats = {
      totalElements: elements.length,
      visibleElements: visible.length,
      culledElements: culledCount,
      cullingRatio: culledCount / elements.length,
      lastUpdateTime: performance.now() - startTime,
    };

    return { visible, stats: this.stats };
  }

  private getViewportHash(viewport: Viewport): string {
    // Create hash for viewport with precision to avoid cache churn
    const precision = 100; // 2 decimal places
    return [
      Math.round(viewport.x * precision),
      Math.round(viewport.y * precision),
      Math.round(viewport.zoom * precision),
      viewport.width,
      viewport.height,
    ].join(',');
  }

  private calculateFrustum(viewport: Viewport): BoundingBox {
    const worldWidth = viewport.width / viewport.zoom;
    const worldHeight = viewport.height / viewport.zoom;
    
    // Add 10% padding to reduce culling pop-in
    const padding = Math.min(worldWidth, worldHeight) * 0.1;

    return {
      x: viewport.x - worldWidth / 2 - padding,
      y: viewport.y - worldHeight / 2 - padding,
      width: worldWidth + padding * 2,
      height: worldHeight + padding * 2,
    };
  }

  private isElementInFrustum(
    element: SpatialElement,
    frustum: BoundingBox,
    viewport: Viewport
  ): boolean {
    const { bounds } = element;
    
    // Quick AABB test
    if (
      bounds.x + bounds.width < frustum.x ||
      bounds.x > frustum.x + frustum.width ||
      bounds.y + bounds.height < frustum.y ||
      bounds.y > frustum.y + frustum.height
    ) {
      return false;
    }

    // Size-based culling - elements too small to see
    const screenSize = Math.min(bounds.width, bounds.height) * viewport.zoom;
    if (screenSize < 0.5) {
      return false;
    }

    // Distance-based culling for very far elements
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const distance = Math.sqrt(
      Math.pow(centerX - viewport.x, 2) + Math.pow(centerY - viewport.y, 2)
    );
    
    const maxDistance = Math.max(viewport.width, viewport.height) / viewport.zoom * 2;
    if (distance > maxDistance) {
      return false;
    }

    return true;
  }

  getStats(): CullingStats {
    return { ...this.stats };
  }

  clearCache(): void {
    this.frustumCache.clear();
    this.lastViewportHash = '';
  }
}