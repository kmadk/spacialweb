/**
 * 3D Spatial Indexing for fast 3D culling
 * Uses octree structure for efficient 3D queries
 */

import type { SpatialElement } from '../types.js';
import type { BoundingBox } from '@fir/penpot-parser';

interface BoundingBox3D extends BoundingBox {
  zMin: number;
  zMax: number;
}

interface OctreeNode {
  bounds: BoundingBox3D;
  elements: SpatialElement[];
  children: OctreeNode[] | null;
  depth: number;
}

export class SpatialIndex3D {
  private root: OctreeNode;
  private maxElements = 10; // Max elements per node before subdivision
  private maxDepth = 8; // Max tree depth

  constructor(worldBounds: BoundingBox3D) {
    this.root = {
      bounds: worldBounds,
      elements: [],
      children: null,
      depth: 0,
    };
  }

  /**
   * Insert element into the octree
   */
  insert(element: SpatialElement): void {
    const bounds3D = this.getElement3DBounds(element);
    this.insertIntoNode(this.root, element, bounds3D);
  }

  /**
   * Query elements within a 3D region
   */
  query(queryBounds: BoundingBox3D): SpatialElement[] {
    const results: SpatialElement[] = [];
    this.queryNode(this.root, queryBounds, results);
    return results;
  }

  /**
   * Fast radius query for frustum culling
   */
  queryRadius(centerX: number, centerY: number, centerZ: number, radius: number): SpatialElement[] {
    const queryBounds: BoundingBox3D = {
      x: centerX - radius,
      y: centerY - radius,
      width: radius * 2,
      height: radius * 2,
      zMin: centerZ - radius,
      zMax: centerZ + radius,
    };
    
    return this.query(queryBounds);
  }

  /**
   * Clear and rebuild the index
   */
  rebuild(elements: SpatialElement[]): void {
    this.clear();
    for (const element of elements) {
      this.insert(element);
    }
  }

  private insertIntoNode(node: OctreeNode, element: SpatialElement, bounds: BoundingBox3D): void {
    if (!this.intersects3D(node.bounds, bounds)) {
      return; // Element doesn't fit in this node
    }

    // If this is a leaf node and we haven't exceeded capacity
    if (!node.children && (node.elements.length < this.maxElements || node.depth >= this.maxDepth)) {
      node.elements.push(element);
      return;
    }

    // Subdivide if needed
    if (!node.children) {
      this.subdivide(node);
    }

    // Try to insert into children
    let inserted = false;
    for (const child of node.children!) {
      if (this.fits3D(child.bounds, bounds)) {
        this.insertIntoNode(child, element, bounds);
        inserted = true;
        break;
      }
    }

    // If element doesn't fit in any child, store in this node
    if (!inserted) {
      node.elements.push(element);
    }
  }

  private subdivide(node: OctreeNode): void {
    const { bounds } = node;
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    const halfDepth = (bounds.zMax - bounds.zMin) / 2;

    node.children = [
      // Bottom octants
      {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin,
          zMax: bounds.zMin + halfDepth,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
      {
        bounds: {
          x: bounds.x + halfWidth,
          y: bounds.y,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin,
          zMax: bounds.zMin + halfDepth,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
      {
        bounds: {
          x: bounds.x,
          y: bounds.y + halfHeight,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin,
          zMax: bounds.zMin + halfDepth,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
      {
        bounds: {
          x: bounds.x + halfWidth,
          y: bounds.y + halfHeight,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin,
          zMax: bounds.zMin + halfDepth,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
      // Top octants
      {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin + halfDepth,
          zMax: bounds.zMax,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
      {
        bounds: {
          x: bounds.x + halfWidth,
          y: bounds.y,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin + halfDepth,
          zMax: bounds.zMax,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
      {
        bounds: {
          x: bounds.x,
          y: bounds.y + halfHeight,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin + halfDepth,
          zMax: bounds.zMax,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
      {
        bounds: {
          x: bounds.x + halfWidth,
          y: bounds.y + halfHeight,
          width: halfWidth,
          height: halfHeight,
          zMin: bounds.zMin + halfDepth,
          zMax: bounds.zMax,
        },
        elements: [],
        children: null,
        depth: node.depth + 1,
      },
    ];

    // Redistribute existing elements
    const elementsToRedistribute = node.elements;
    node.elements = [];
    
    for (const element of elementsToRedistribute) {
      const bounds3D = this.getElement3DBounds(element);
      this.insertIntoNode(node, element, bounds3D);
    }
  }

  private queryNode(node: OctreeNode, queryBounds: BoundingBox3D, results: SpatialElement[]): void {
    if (!this.intersects3D(node.bounds, queryBounds)) {
      return;
    }

    // Add elements from this node
    for (const element of node.elements) {
      const elementBounds = this.getElement3DBounds(element);
      if (this.intersects3D(elementBounds, queryBounds)) {
        results.push(element);
      }
    }

    // Query children
    if (node.children) {
      for (const child of node.children) {
        this.queryNode(child, queryBounds, results);
      }
    }
  }

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

  private intersects3D(bounds1: BoundingBox3D, bounds2: BoundingBox3D): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds1.x > bounds2.x + bounds2.width ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds1.y > bounds2.y + bounds2.height ||
      bounds1.zMax < bounds2.zMin ||
      bounds1.zMin > bounds2.zMax
    );
  }

  private fits3D(container: BoundingBox3D, contained: BoundingBox3D): boolean {
    return (
      contained.x >= container.x &&
      contained.y >= container.y &&
      contained.x + contained.width <= container.x + container.width &&
      contained.y + contained.height <= container.y + container.height &&
      contained.zMin >= container.zMin &&
      contained.zMax <= container.zMax
    );
  }

  private clear(): void {
    this.root.elements = [];
    this.root.children = null;
  }

  /**
   * Performance statistics
   */
  getStats(): {
    totalNodes: number;
    totalElements: number;
    maxDepthReached: number;
    averageElementsPerLeaf: number;
  } {
    let totalNodes = 0;
    let totalElements = 0;
    let maxDepth = 0;
    let leafNodes = 0;
    let totalLeafElements = 0;

    const traverse = (node: OctreeNode) => {
      totalNodes++;
      totalElements += node.elements.length;
      maxDepth = Math.max(maxDepth, node.depth);

      if (!node.children) {
        leafNodes++;
        totalLeafElements += node.elements.length;
      } else {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);

    return {
      totalNodes,
      totalElements,
      maxDepthReached: maxDepth,
      averageElementsPerLeaf: leafNodes > 0 ? totalLeafElements / leafNodes : 0,
    };
  }
}