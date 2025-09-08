/**
 * 3D Viewport Culling System
 * Enhanced viewport culling with Z-axis frustum culling and occlusion detection
 */

import type { Viewport, SpatialElement, Point3D } from '../types.js';
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
  private occlusionTestDistance = 50; // Distance within which occlusion testing is performed
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
    this.performOcclusionCulling(nearElements, viewerZ);
    
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
  private performOcclusionCulling(elements: OcclusionInfo[], viewerZ: number): void {
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
    }\n  }\n  \n  /**\n   * Build spatial grid for occlusion testing optimization\n   */\n  private buildOcclusionGrid(elements: OcclusionInfo[]): void {\n    this.occlusionGrid.clear();\n    \n    for (const elementInfo of elements) {\n      const bounds = elementInfo.bounds3D;\n      \n      // Calculate grid cells this element spans\n      const minGridX = Math.floor(bounds.x / this.gridSize);\n      const maxGridX = Math.floor((bounds.x + bounds.width) / this.gridSize);\n      const minGridY = Math.floor(bounds.y / this.gridSize);\n      const maxGridY = Math.floor((bounds.y + bounds.height) / this.gridSize);\n      \n      for (let gx = minGridX; gx <= maxGridX; gx++) {\n        for (let gy = minGridY; gy <= maxGridY; gy++) {\n          const gridKey = `${gx},${gy}`;\n          if (!this.occlusionGrid.has(gridKey)) {\n            this.occlusionGrid.set(gridKey, []);\n          }\n          this.occlusionGrid.get(gridKey)!.push(elementInfo.element);\n        }\n      }\n    }\n  }\n  \n  /**\n   * Calculate occlusion factor for an element\n   */\n  private calculateOcclusionFactor(testElement: OcclusionInfo, occluders: OcclusionInfo[]): number {\n    let totalOcclusion = 0;\n    const testBounds = testElement.bounds3D;\n    \n    // Get potential occluders from grid cells\n    const potentialOccluders = this.getPotentialOccluders(testBounds);\n    \n    for (const occluderInfo of occluders) {\n      if (!potentialOccluders.includes(occluderInfo.element)) {\n        continue;\n      }\n      \n      const occluder = occluderInfo.bounds3D;\n      \n      // Check if occluder is in front of test element\n      if (occluder.zMax >= testBounds.zMin) {\n        continue;\n      }\n      \n      // Calculate overlap area\n      const overlapArea = this.calculateOverlapArea(testBounds, occluder);\n      const testElementArea = testBounds.width * testBounds.height;\n      \n      if (testElementArea > 0) {\n        const occlusionRatio = overlapArea / testElementArea;\n        \n        // Consider opacity of occluder\n        const occluderOpacity = occluderInfo.element.data?.styles?.opacity ?? 1;\n        totalOcclusion += occlusionRatio * occluderOpacity;\n      }\n    }\n    \n    return Math.min(totalOcclusion, 1); // Clamp to maximum occlusion of 100%\n  }\n  \n  /**\n   * Get potential occluders from grid\n   */\n  private getPotentialOccluders(bounds: BoundingBox3D): SpatialElement[] {\n    const elements = new Set<SpatialElement>();\n    \n    const minGridX = Math.floor(bounds.x / this.gridSize);\n    const maxGridX = Math.floor((bounds.x + bounds.width) / this.gridSize);\n    const minGridY = Math.floor(bounds.y / this.gridSize);\n    const maxGridY = Math.floor((bounds.y + bounds.height) / this.gridSize);\n    \n    for (let gx = minGridX; gx <= maxGridX; gx++) {\n      for (let gy = minGridY; gy <= maxGridY; gy++) {\n        const gridKey = `${gx},${gy}`;\n        const gridElements = this.occlusionGrid.get(gridKey) ?? [];\n        gridElements.forEach(element => elements.add(element));\n      }\n    }\n    \n    return Array.from(elements);\n  }\n  \n  /**\n   * Calculate overlap area between two 2D rectangles\n   */\n  private calculateOverlapArea(rect1: BoundingBox, rect2: BoundingBox): number {\n    const left = Math.max(rect1.x, rect2.x);\n    const right = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);\n    const top = Math.max(rect1.y, rect2.y);\n    const bottom = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);\n    \n    if (left < right && top < bottom) {\n      return (right - left) * (bottom - top);\n    }\n    \n    return 0;\n  }\n  \n  /**\n   * Fallback 2D culling for backward compatibility\n   */\n  private cull2D(elements: SpatialElement[], viewport: Viewport): {\n    visibleElements: SpatialElement[];\n    culledElements: SpatialElement[];\n    occlusionInfo: OcclusionInfo[];\n    statistics: {\n      totalElements: number;\n      frustumCulled: number;\n      occlusionCulled: number;\n      visibleElements: number;\n    };\n  } {\n    const worldWidth = viewport.width / viewport.zoom;\n    const worldHeight = viewport.height / viewport.zoom;\n    const viewportBounds = {\n      x: viewport.x - worldWidth / 2,\n      y: viewport.y - worldHeight / 2,\n      width: worldWidth,\n      height: worldHeight,\n    };\n    \n    const visibleElements: SpatialElement[] = [];\n    const culledElements: SpatialElement[] = [];\n    \n    for (const element of elements) {\n      if (this.boundsIntersect(element.bounds, viewportBounds)) {\n        visibleElements.push(element);\n      } else {\n        culledElements.push(element);\n      }\n    }\n    \n    return {\n      visibleElements,\n      culledElements,\n      occlusionInfo: [],\n      statistics: {\n        totalElements: elements.length,\n        frustumCulled: culledElements.length,\n        occlusionCulled: 0,\n        visibleElements: visibleElements.length,\n      },\n    };\n  }\n  \n  private boundsIntersect(bounds1: BoundingBox, bounds2: BoundingBox): boolean {\n    return !(\n      bounds1.x + bounds1.width < bounds2.x ||\n      bounds1.x > bounds2.x + bounds2.width ||\n      bounds1.y + bounds1.height < bounds2.y ||\n      bounds1.y > bounds2.y + bounds2.height\n    );\n  }\n  \n  /**\n   * Configuration methods\n   */\n  setFrustumCullDistance(distance: number): void {\n    this.frustumCullDistance = distance;\n  }\n  \n  setOcclusionTestDistance(distance: number): void {\n    this.occlusionTestDistance = distance;\n  }\n  \n  setLODDistanceThresholds(thresholds: number[]): void {\n    this.lodDistanceThresholds = [...thresholds].sort((a, b) => a - b);\n  }\n  \n  setGridSize(size: number): void {\n    this.gridSize = size;\n  }\n}