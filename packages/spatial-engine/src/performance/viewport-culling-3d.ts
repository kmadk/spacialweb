/**
 * 3D Viewport Culling System
 * Enhanced viewport culling with Z-axis frustum culling and occlusion detection
 */

import type { Viewport, SpatialElement } from '../types.js';
import type { BoundingBox } from '@fir/penpot-parser';

interface BoundingBox3D extends BoundingBox {
  zMin: number;
  zMax: number;
}

interface Frustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
}

interface OcclusionInfo {
  element: SpatialElement;
  bounds3D: BoundingBox3D;
  distanceFromViewer: number;
  isOccluded: boolean;
  occlusionFactor: number; // 0 = fully visible, 1 = fully occluded
}

export class ViewportCulling3D {
  private frustumCullDistance = 200; // Distance beyond which elements are culled
  // private occlusionTestDistance = 50; // Distance within which occlusion testing is performed
  private lodDistanceThresholds = [20, 50, 100, 200]; // Distance thresholds for LOD levels
  
  // Occlusion testing grid for performance
  private occlusionGrid: Map<string, SpatialElement[]> = new Map();
  private gridSize = 100; // Size of each grid cell
  
  /**
   * Perform comprehensive 3D culling
   */
  cullElements(elements: SpatialElement[], viewport: Viewport): {
    visibleElements: SpatialElement[];
    culledElements: SpatialElement[];
    occlusionInfo: OcclusionInfo[];
    statistics: {
      totalElements: number;
      frustumCulled: number;
      occlusionCulled: number;
      visibleElements: number;
    };
  } {
    if (!viewport.z) {
      // Fall back to 2D culling if no Z coordinate
      return this.cull2D(elements, viewport);
    }

    const frustum = this.createFrustum(viewport);
    const viewerZ = viewport.z;
    
    const frustumCulled: SpatialElement[] = [];
    const potentiallyVisible: SpatialElement[] = [];
    
    // Step 1: Frustum culling
    for (const element of elements) {
      const bounds3D = this.getElement3DBounds(element);
      
      if (this.isInFrustum(bounds3D, frustum)) {
        potentiallyVisible.push(element);
      } else {
        frustumCulled.push(element);
      }
    }
    
    // Step 2: Distance-based culling and LOD assignment
    const nearElements: OcclusionInfo[] = [];
    const farElements: SpatialElement[] = [];
    
    for (const element of potentiallyVisible) {
      const bounds3D = this.getElement3DBounds(element);
      const distance = this.calculateDistance(bounds3D, viewerZ);
      
      if (distance > this.frustumCullDistance) {
        farElements.push(element);
        continue;
      }
      
      // Assign LOD level based on distance
      element.lodLevel = this.calculateLODLevel(distance);
      
      nearElements.push({
        element,
        bounds3D,
        distanceFromViewer: distance,
        isOccluded: false,
        occlusionFactor: 0,
      });
    }
    
    // Step 3: Occlusion culling for near elements
    this.performOcclusionCulling(nearElements);
    
    // Step 4: Extract visible elements
    const visibleElements = nearElements
      .filter(info => !info.isOccluded || info.occlusionFactor < 0.9)
      .map(info => {
        // Adjust opacity based on occlusion factor
        if (info.occlusionFactor > 0) {
          info.element.data = {
            ...info.element.data,
            styles: {
              ...info.element.data?.styles,
              opacity: (info.element.data?.styles?.opacity ?? 1) * (1 - info.occlusionFactor * 0.5),
            },
          };
        }
        return info.element;
      });
    
    const culledElements = [...frustumCulled, ...farElements, ...nearElements.filter(info => info.isOccluded).map(info => info.element)];
    
    return {
      visibleElements,
      culledElements,
      occlusionInfo: nearElements,
      statistics: {
        totalElements: elements.length,
        frustumCulled: frustumCulled.length + farElements.length,
        occlusionCulled: nearElements.filter(info => info.isOccluded).length,
        visibleElements: visibleElements.length,
      },
    };
  }
  
  /**
   * Create viewing frustum from viewport
   */
  private createFrustum(viewport: Viewport): Frustum {
    const { x, y, z = 0, zoom, width, height } = viewport;
    
    const worldWidth = width / zoom;
    const worldHeight = height / zoom;
    
    return {
      left: x - worldWidth / 2,
      right: x + worldWidth / 2,
      top: y - worldHeight / 2,
      bottom: y + worldHeight / 2,
      near: z - this.frustumCullDistance / 2,
      far: z + this.frustumCullDistance / 2,
    };
  }
  
  /**
   * Test if 3D bounding box intersects frustum
   */
  private isInFrustum(bounds: BoundingBox3D, frustum: Frustum): boolean {
    return !(
      bounds.x + bounds.width < frustum.left ||
      bounds.x > frustum.right ||
      bounds.y + bounds.height < frustum.top ||
      bounds.y > frustum.bottom ||
      bounds.zMax < frustum.near ||
      bounds.zMin > frustum.far
    );
  }
  
  /**
   * Get 3D bounding box for element
   */
  private getElement3DBounds(element: SpatialElement): BoundingBox3D {
    const zPos = element.zPosition ?? 0;
    const zSize = element.zBounds ? element.zBounds.far - element.zBounds.near : 1;
    
    return {
      x: element.bounds.x,
      y: element.bounds.y,
      width: element.bounds.width,
      height: element.bounds.height,
      zMin: element.zBounds?.near ?? zPos - zSize / 2,
      zMax: element.zBounds?.far ?? zPos + zSize / 2,
    };
  }
  
  /**
   * Calculate distance from element to viewer
   */
  private calculateDistance(bounds: BoundingBox3D, viewerZ: number): number {
    const elementCenterZ = (bounds.zMin + bounds.zMax) / 2;
    return Math.abs(elementCenterZ - viewerZ);
  }
  
  /**
   * Calculate LOD level based on distance
   */
  private calculateLODLevel(distance: number): number {
    for (let i = 0; i < this.lodDistanceThresholds.length; i++) {
      if (distance <= this.lodDistanceThresholds[i]) {
        return i;
      }
    }
    return this.lodDistanceThresholds.length; // Lowest detail
  }
  
  /**
   * Perform occlusion culling on near elements
   */
  private performOcclusionCulling(elements: OcclusionInfo[]): void {
    // Sort by distance from viewer (front to back)
    elements.sort((a, b) => a.distanceFromViewer - b.distanceFromViewer);
    
    // Build occlusion grid
    this.buildOcclusionGrid(elements);
    
    // Test each element for occlusion
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Skip occlusion testing for very close elements
      if (element.distanceFromViewer < 5) {
        continue;
      }
      
      // Test against closer elements in the same grid cells
      const occlusionFactor = this.calculateOcclusionFactor(element, elements.slice(0, i));
      element.occlusionFactor = occlusionFactor;
      element.isOccluded = occlusionFactor > 0.8; // 80% occluded = considered occluded
    }
  }
  
  /**
   * Build spatial grid for occlusion testing optimization
   */
  private buildOcclusionGrid(elements: OcclusionInfo[]): void {
    this.occlusionGrid.clear();
    
    for (const elementInfo of elements) {
      const bounds = elementInfo.bounds3D;
      
      // Calculate grid cells this element spans
      const minGridX = Math.floor(bounds.x / this.gridSize);
      const maxGridX = Math.floor((bounds.x + bounds.width) / this.gridSize);
      const minGridY = Math.floor(bounds.y / this.gridSize);
      const maxGridY = Math.floor((bounds.y + bounds.height) / this.gridSize);
      
      for (let gx = minGridX; gx <= maxGridX; gx++) {
        for (let gy = minGridY; gy <= maxGridY; gy++) {
          const gridKey = `${gx},${gy}`;
          if (!this.occlusionGrid.has(gridKey)) {
            this.occlusionGrid.set(gridKey, []);
          }
          this.occlusionGrid.get(gridKey)!.push(elementInfo.element);
        }
      }
    }
  }
  
  /**
   * Calculate occlusion factor for an element
   */
  private calculateOcclusionFactor(testElement: OcclusionInfo, occluders: OcclusionInfo[]): number {
    let totalOcclusion = 0;
    const testBounds = testElement.bounds3D;
    
    // Get potential occluders from grid cells
    const potentialOccluders = this.getPotentialOccluders(testBounds);
    
    for (const occluderInfo of occluders) {
      if (!potentialOccluders.includes(occluderInfo.element)) {
        continue;
      }
      
      const occluder = occluderInfo.bounds3D;
      
      // Check if occluder is in front of test element
      if (occluder.zMax >= testBounds.zMin) {
        continue;
      }
      
      // Calculate overlap area
      const overlapArea = this.calculateOverlapArea(testBounds, occluder);
      const testElementArea = testBounds.width * testBounds.height;
      
      if (testElementArea > 0) {
        const occlusionRatio = overlapArea / testElementArea;
        
        // Consider opacity of occluder
        const occluderOpacity = occluderInfo.element.data?.styles?.opacity ?? 1;
        totalOcclusion += occlusionRatio * occluderOpacity;
      }
    }
    
    return Math.min(totalOcclusion, 1); // Clamp to maximum occlusion of 100%
  }
  
  /**
   * Get potential occluders from grid
   */
  private getPotentialOccluders(bounds: BoundingBox3D): SpatialElement[] {
    const elements = new Set<SpatialElement>();
    
    const minGridX = Math.floor(bounds.x / this.gridSize);
    const maxGridX = Math.floor((bounds.x + bounds.width) / this.gridSize);
    const minGridY = Math.floor(bounds.y / this.gridSize);
    const maxGridY = Math.floor((bounds.y + bounds.height) / this.gridSize);
    
    for (let gx = minGridX; gx <= maxGridX; gx++) {
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        const gridKey = `${gx},${gy}`;
        const gridElements = this.occlusionGrid.get(gridKey) ?? [];
        gridElements.forEach(element => elements.add(element));
      }
    }
    
    return Array.from(elements);
  }
  
  /**
   * Calculate overlap area between two 2D rectangles
   */
  private calculateOverlapArea(rect1: BoundingBox, rect2: BoundingBox): number {
    const left = Math.max(rect1.x, rect2.x);
    const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
    const top = Math.max(rect1.y, rect2.y);
    const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
    
    if (left < right && top < bottom) {
      return (right - left) * (bottom - top);
    }
    
    return 0;
  }
  
  /**
   * Fallback 2D culling for backward compatibility
   */
  private cull2D(elements: SpatialElement[], viewport: Viewport): {
    visibleElements: SpatialElement[];
    culledElements: SpatialElement[];
    occlusionInfo: OcclusionInfo[];
    statistics: {
      totalElements: number;
      frustumCulled: number;
      occlusionCulled: number;
      visibleElements: number;
    };
  } {
    const worldWidth = viewport.width / viewport.zoom;
    const worldHeight = viewport.height / viewport.zoom;
    const viewportBounds = {
      x: viewport.x - worldWidth / 2,
      y: viewport.y - worldHeight / 2,
      width: worldWidth,
      height: worldHeight,
    };
    
    const visibleElements: SpatialElement[] = [];
    const culledElements: SpatialElement[] = [];
    
    for (const element of elements) {
      if (this.boundsIntersect(element.bounds, viewportBounds)) {
        visibleElements.push(element);
      } else {
        culledElements.push(element);
      }
    }
    
    return {
      visibleElements,
      culledElements,
      occlusionInfo: [],
      statistics: {
        totalElements: elements.length,
        frustumCulled: culledElements.length,
        occlusionCulled: 0,
        visibleElements: visibleElements.length,
      },
    };
  }
  
  private boundsIntersect(bounds1: BoundingBox, bounds2: BoundingBox): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds1.x > bounds2.x + bounds2.width ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds1.y > bounds2.y + bounds2.height
    );
  }
  
  /**
   * Configuration methods
   */
  setFrustumCullDistance(distance: number): void {
    this.frustumCullDistance = distance;
  }
  
  setOcclusionTestDistance(distance: number): void {
    // this.occlusionTestDistance = distance;
  }
  
  setLODDistanceThresholds(thresholds: number[]): void {
    this.lodDistanceThresholds = [...thresholds].sort((a, b) => a - b);
  }
  
  setGridSize(size: number): void {
    this.gridSize = size;
  }
}