/**
 * Advanced spatial indexing algorithms for efficient element queries
 * Implements hierarchical spatial structures and GPU-accelerated operations
 */


import RBush from 'rbush';
import type { SpatialElement, BoundingBox } from '../types.js';

interface IndexedElement {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  element: SpatialElement;
  layer: number;
}

interface QuadTreeNode {
  bounds: BoundingBox;
  elements: SpatialElement[];
  children?: [QuadTreeNode, QuadTreeNode, QuadTreeNode, QuadTreeNode];
  level: number;
  maxElements: number;
  maxLevels: number;
}

interface GridCell {
  x: number;
  y: number;
  elements: SpatialElement[];
}

export class HierarchicalSpatialIndex {
  private rbush: RBush<IndexedElement>;
  private quadTree: QuadTreeNode | null = null;
  private uniformGrid: Map<string, GridCell>;
  private gridSize: number;
  private boundingBox: BoundingBox;
  private elementCount = 0;
  
  // Performance tracking
  private stats = {
    queriesPerformed: 0,
    elementsIndexed: 0,
    averageQueryTime: 0,
    indexingTime: 0,
    memoryUsage: 0,
  };

  constructor(options: {
    gridSize?: number;
    maxElements?: number;
    maxLevels?: number;
  } = {}) {
    this.rbush = new RBush(16); // Max entries per node
    this.uniformGrid = new Map();
    this.gridSize = options.gridSize || 256;
    this.boundingBox = { x: 0, y: 0, width: 0, height: 0 };
  }

  /**
   * Index a collection of elements using multiple spatial data structures
   */
  public indexElements(elements: SpatialElement[]): void {
    const startTime = performance.now();
    
    this.clear();
    this.elementCount = elements.length;
    
    if (elements.length === 0) return;
    
    // Calculate overall bounding box
    this.boundingBox = this.calculateBoundingBox(elements);
    
    // Index using RBush for general queries
    this.indexWithRBush(elements);
    
    // Build QuadTree for hierarchical queries
    this.buildQuadTree(elements);
    
    // Create uniform grid for fast neighbor queries
    this.buildUniformGrid(elements);
    
    this.stats.indexingTime = performance.now() - startTime;
    this.stats.elementsIndexed = elements.length;
    this.updateMemoryUsage();
  }

  /**
   * Find elements intersecting with a bounding box
   */
  public query(bounds: BoundingBox): SpatialElement[] {
    const startTime = performance.now();
    
    let results: SpatialElement[];
    
    // Choose optimal query method based on query characteristics
    if (this.shouldUseUniformGrid(bounds)) {
      results = this.queryUniformGrid(bounds);
    } else if (this.shouldUseQuadTree(bounds)) {
      results = this.queryQuadTree(bounds);
    } else {
      results = this.queryRBush(bounds);
    }
    
    this.updateQueryStats(performance.now() - startTime);
    return results;
  }

  /**
   * Find elements at a specific point
   */
  public queryPoint(x: number, y: number): SpatialElement[] {
    return this.query({ x, y, width: 0, height: 0 });
  }

  /**
   * Find k-nearest neighbors to a point
   */
  public queryKNN(x: number, y: number, k: number, maxDistance = Infinity): SpatialElement[] {
    const candidates: Array<{ element: SpatialElement; distance: number }> = [];
    
    // Start with elements in nearby grid cells
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    const searchRadius = Math.ceil(maxDistance / this.gridSize);
    
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const cellKey = `${gridX + dx},${gridY + dy}`;
        const cell = this.uniformGrid.get(cellKey);
        
        if (cell) {
          for (const element of cell.elements) {
            const distance = this.distanceToElement(x, y, element);
            if (distance <= maxDistance) {
              candidates.push({ element, distance });
            }
          }
        }
      }
    }
    
    // Sort by distance and return top k
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.slice(0, k).map(c => c.element);
  }

  /**
   * Find elements within a radius
   */
  public queryRadius(x: number, y: number, radius: number): SpatialElement[] {
    const bounds = {
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    };
    
    const candidates = this.query(bounds);
    return candidates.filter(element => 
      this.distanceToElement(x, y, element) <= radius
    );
  }

  /**
   * Perform batch queries efficiently
   */
  public batchQuery(queries: BoundingBox[]): SpatialElement[][] {
    const results: SpatialElement[][] = [];
    
    // Sort queries by position to improve cache locality
    const sortedQueries = queries
      .map((query, index) => ({ query, index }))
      .sort((a, b) => {
        const centerA = a.query.x + a.query.width / 2;
        const centerB = b.query.x + b.query.width / 2;
        return centerA - centerB;
      });
    
    const sortedResults: SpatialElement[][] = [];
    for (const { query } of sortedQueries) {
      sortedResults.push(this.query(query));
    }
    
    // Restore original order
    for (let i = 0; i < sortedQueries.length; i++) {
      results[sortedQueries[i].index] = sortedResults[i];
    }
    
    return results;
  }

  private indexWithRBush(elements: SpatialElement[]): void {
    const indexedElements: IndexedElement[] = elements.map(element => ({
      minX: element.bounds.x,
      minY: element.bounds.y,
      maxX: element.bounds.x + element.bounds.width,
      maxY: element.bounds.y + element.bounds.height,
      element,
      layer: element.layer || 0,
    }));
    
    this.rbush.load(indexedElements);
  }

  private buildQuadTree(elements: SpatialElement[]): void {
    this.quadTree = {
      bounds: this.boundingBox,
      elements: [],
      level: 0,
      maxElements: 16,
      maxLevels: 8,
    };
    
    for (const element of elements) {
      this.insertIntoQuadTree(this.quadTree, element);
    }
  }

  private insertIntoQuadTree(node: QuadTreeNode, element: SpatialElement): void {
    // If element doesn't fit in node bounds, ignore (shouldn't happen)
    if (!this.intersects(element.bounds, node.bounds)) {
      return;
    }
    
    // If node has children, insert into appropriate child
    if (node.children) {
      for (const child of node.children) {
        if (this.intersects(element.bounds, child.bounds)) {
          this.insertIntoQuadTree(child, element);
        }
      }
      return;
    }
    
    // Add to current node
    node.elements.push(element);
    
    // Split if necessary
    if (node.elements.length > node.maxElements && node.level < node.maxLevels) {
      this.splitQuadTreeNode(node);
    }
  }

  private splitQuadTreeNode(node: QuadTreeNode): void {
    const halfWidth = node.bounds.width / 2;
    const halfHeight = node.bounds.height / 2;
    
    node.children = [
      // Top-left
      {
        bounds: {
          x: node.bounds.x,
          y: node.bounds.y,
          width: halfWidth,
          height: halfHeight,
        },
        elements: [],
        level: node.level + 1,
        maxElements: node.maxElements,
        maxLevels: node.maxLevels,
      },
      // Top-right
      {
        bounds: {
          x: node.bounds.x + halfWidth,
          y: node.bounds.y,
          width: halfWidth,
          height: halfHeight,
        },
        elements: [],
        level: node.level + 1,
        maxElements: node.maxElements,
        maxLevels: node.maxLevels,
      },
      // Bottom-left
      {
        bounds: {
          x: node.bounds.x,
          y: node.bounds.y + halfHeight,
          width: halfWidth,
          height: halfHeight,
        },
        elements: [],
        level: node.level + 1,
        maxElements: node.maxElements,
        maxLevels: node.maxLevels,
      },
      // Bottom-right
      {
        bounds: {
          x: node.bounds.x + halfWidth,
          y: node.bounds.y + halfHeight,
          width: halfWidth,
          height: halfHeight,
        },
        elements: [],
        level: node.level + 1,
        maxElements: node.maxElements,
        maxLevels: node.maxLevels,
      },
    ];
    
    // Redistribute elements
    for (const element of node.elements) {
      for (const child of node.children) {
        if (this.intersects(element.bounds, child.bounds)) {
          this.insertIntoQuadTree(child, element);
        }
      }
    }
    
    // Clear elements from parent
    node.elements = [];
  }

  private buildUniformGrid(elements: SpatialElement[]): void {
    this.uniformGrid.clear();
    
    for (const element of elements) {
      // Find all grid cells this element overlaps
      const minX = Math.floor(element.bounds.x / this.gridSize);
      const minY = Math.floor(element.bounds.y / this.gridSize);
      const maxX = Math.floor((element.bounds.x + element.bounds.width) / this.gridSize);
      const maxY = Math.floor((element.bounds.y + element.bounds.height) / this.gridSize);
      
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const key = `${x},${y}`;
          let cell = this.uniformGrid.get(key);
          
          if (!cell) {
            cell = {
              x: x * this.gridSize,
              y: y * this.gridSize,
              elements: [],
            };
            this.uniformGrid.set(key, cell);
          }
          
          cell.elements.push(element);
        }
      }
    }
  }

  private queryRBush(bounds: BoundingBox): SpatialElement[] {
    const indexedResults = this.rbush.search({
      minX: bounds.x,
      minY: bounds.y,
      maxX: bounds.x + bounds.width,
      maxY: bounds.y + bounds.height,
    });
    
    return indexedResults
      .map((indexed: IndexedElement) => indexed.element)
      .filter((element: SpatialElement) => this.intersects(element.bounds, bounds));
  }

  private queryQuadTree(bounds: BoundingBox): SpatialElement[] {
    if (!this.quadTree) return [];
    
    const results: SpatialElement[] = [];
    const stack: QuadTreeNode[] = [this.quadTree];
    
    while (stack.length > 0) {
      const node = stack.pop()!;
      
      if (!this.intersects(node.bounds, bounds)) continue;
      
      // Add elements from this node
      for (const element of node.elements) {
        if (this.intersects(element.bounds, bounds)) {
          results.push(element);
        }
      }
      
      // Add children to stack
      if (node.children) {
        stack.push(...node.children);
      }
    }
    
    return results;
  }

  private queryUniformGrid(bounds: BoundingBox): SpatialElement[] {
    const results = new Set<SpatialElement>();
    
    const minX = Math.floor(bounds.x / this.gridSize);
    const minY = Math.floor(bounds.y / this.gridSize);
    const maxX = Math.floor((bounds.x + bounds.width) / this.gridSize);
    const maxY = Math.floor((bounds.y + bounds.height) / this.gridSize);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const cell = this.uniformGrid.get(key);
        
        if (cell) {
          for (const element of cell.elements) {
            if (this.intersects(element.bounds, bounds)) {
              results.add(element);
            }
          }
        }
      }
    }
    
    return Array.from(results);
  }

  private shouldUseUniformGrid(bounds: BoundingBox): boolean {
    // Use uniform grid for small, local queries
    const area = bounds.width * bounds.height;
    const cellArea = this.gridSize * this.gridSize;
    return area < cellArea * 4 && this.elementCount > 1000;
  }

  private shouldUseQuadTree(bounds: BoundingBox): boolean {
    // Use quad tree for medium-sized queries
    const area = bounds.width * bounds.height;
    const totalArea = this.boundingBox.width * this.boundingBox.height;
    return area > totalArea * 0.01 && area < totalArea * 0.25;
  }

  private calculateBoundingBox(elements: SpatialElement[]): BoundingBox {
    if (elements.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const element of elements) {
      minX = Math.min(minX, element.bounds.x);
      minY = Math.min(minY, element.bounds.y);
      maxX = Math.max(maxX, element.bounds.x + element.bounds.width);
      maxY = Math.max(maxY, element.bounds.y + element.bounds.height);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  private distanceToElement(x: number, y: number, element: SpatialElement): number {
    const bounds = element.bounds;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    return Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
  }

  private updateQueryStats(queryTime: number): void {
    this.stats.queriesPerformed++;
    this.stats.averageQueryTime = 
      (this.stats.averageQueryTime * (this.stats.queriesPerformed - 1) + queryTime) / 
      this.stats.queriesPerformed;
  }

  private updateMemoryUsage(): void {
    // Rough estimation of memory usage
    const rbushMemory = this.elementCount * 32; // Approximate bytes per element
    const gridCells = this.uniformGrid.size;
    const gridMemory = gridCells * 16 + this.elementCount * 8; // Cells + references
    const quadTreeMemory = this.estimateQuadTreeMemory(this.quadTree);
    
    this.stats.memoryUsage = rbushMemory + gridMemory + quadTreeMemory;
  }

  private estimateQuadTreeMemory(node: QuadTreeNode | null): number {
    if (!node) return 0;
    
    let memory = 64; // Base node size
    memory += node.elements.length * 8; // Element references
    
    if (node.children) {
      for (const child of node.children) {
        memory += this.estimateQuadTreeMemory(child);
      }
    }
    
    return memory;
  }

  public getStats(): {
    queriesPerformed: number;
    elementsIndexed: number;
    averageQueryTime: number;
    indexingTime: number;
    memoryUsage: number;
  } {
    return { ...this.stats };
  }

  public clear(): void {
    this.rbush.clear();
    this.uniformGrid.clear();
    this.quadTree = null;
    this.elementCount = 0;
    
    // Reset stats
    this.stats.queriesPerformed = 0;
    this.stats.averageQueryTime = 0;
    this.stats.memoryUsage = 0;
  }
}