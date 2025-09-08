/**
 * Web Worker for heavy 3D culling operations
 * Offloads expensive calculations to separate thread
 */

// Worker message types
interface CullingWorkMessage {
  type: 'cull';
  elements: any[]; // Serialized spatial elements
  viewport: any; // Serialized viewport
  options: {
    frustumCullDistance: number;
    lodThresholds: number[];
    gridSize: number;
  };
}

interface CullingResultMessage {
  type: 'cullResult';
  visibleElements: any[];
  culledElements: any[];
  statistics: {
    totalElements: number;
    frustumCulled: number;
    occlusionCulled: number;
    visibleElements: number;
  };
}

// Main thread worker manager
export class CullingWorkerManager {
  private worker: Worker | null = null;
  private pendingCallbacks = new Map<string, (result: any) => void>();
  private requestId = 0;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.initializeWorker();
    }
  }

  private initializeWorker(): void {
    // Create worker from inline script to avoid separate file
    const workerScript = `
      ${this.getWorkerScript()}
    `;
    
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
    
    this.worker.onmessage = (event) => {
      const { requestId, result } = event.data;
      const callback = this.pendingCallbacks.get(requestId);
      if (callback) {
        callback(result);
        this.pendingCallbacks.delete(requestId);
      }
    };
  }

  async cullElements(elements: any[], viewport: any, options: any): Promise<any> {
    if (!this.worker) {
      // Fallback to main thread if no worker support
      return this.fallbackCull(elements, viewport, options);
    }

    return new Promise((resolve) => {
      const requestId = (++this.requestId).toString();
      this.pendingCallbacks.set(requestId, resolve);
      
      this.worker!.postMessage({
        requestId,
        type: 'cull',
        elements: this.serializeElements(elements),
        viewport,
        options,
      });
    });
  }

  private serializeElements(elements: any[]): any[] {
    // Only serialize the data needed for culling
    return elements.map(element => ({
      id: element.id,
      bounds: element.bounds,
      zPosition: element.zPosition,
      zBounds: element.zBounds,
      lodLevel: element.lodLevel,
    }));
  }

  private fallbackCull(elements: any[], viewport: any, options: any): any {
    // Simplified main-thread culling for fallback
    const viewerZ = viewport.z || 0;
    const cullDistance = options.frustumCullDistance || 200;
    
    const visibleElements = elements.filter(element => {
      const elementZ = element.zPosition || 0;
      const distance = Math.abs(elementZ - viewerZ);
      return distance <= cullDistance;
    });

    return {
      visibleElements,
      culledElements: elements.filter(e => !visibleElements.includes(e)),
      statistics: {
        totalElements: elements.length,
        frustumCulled: elements.length - visibleElements.length,
        occlusionCulled: 0,
        visibleElements: visibleElements.length,
      },
    };
  }

  private getWorkerScript(): string {
    return `
      // 3D bounds interface
      class BoundingBox3D {
        constructor(element) {
          this.x = element.bounds.x;
          this.y = element.bounds.y;
          this.width = element.bounds.width;
          this.height = element.bounds.height;
          
          const zPos = element.zPosition || 0;
          const zSize = element.zBounds ? element.zBounds.far - element.zBounds.near : 1;
          this.zMin = element.zBounds?.near || zPos - zSize / 2;
          this.zMax = element.zBounds?.far || zPos + zSize / 2;
        }
      }

      // Fast 3D culling implementation
      class FastCuller {
        constructor(options) {
          this.frustumCullDistance = options.frustumCullDistance || 200;
          this.lodThresholds = options.lodThresholds || [20, 50, 100, 200];
          this.gridSize = options.gridSize || 100;
        }

        cull(elements, viewport) {
          if (!viewport.z) {
            return this.cull2D(elements, viewport);
          }

          const frustum = this.createFrustum(viewport);
          const viewerZ = viewport.z;
          
          const frustumCulled = [];
          const potentiallyVisible = [];
          
          // Step 1: Fast frustum culling
          for (const element of elements) {
            const bounds3D = new BoundingBox3D(element);
            
            if (this.isInFrustum(bounds3D, frustum)) {
              potentiallyVisible.push({ element, bounds3D });
            } else {
              frustumCulled.push(element);
            }
          }
          
          // Step 2: Distance culling and LOD
          const visibleElements = [];
          const distanceCulled = [];
          
          for (const { element, bounds3D } of potentiallyVisible) {
            const distance = this.calculateDistance(bounds3D, viewerZ);
            
            if (distance > this.frustumCullDistance) {
              distanceCulled.push(element);
              continue;
            }
            
            // Assign LOD
            element.lodLevel = this.calculateLODLevel(distance);
            visibleElements.push(element);
          }
          
          const culledElements = [...frustumCulled, ...distanceCulled];
          
          return {
            visibleElements,
            culledElements,
            statistics: {
              totalElements: elements.length,
              frustumCulled: frustumCulled.length + distanceCulled.length,
              occlusionCulled: 0, // TODO: Add occlusion in worker
              visibleElements: visibleElements.length,
            },
          };
        }

        createFrustum(viewport) {
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

        isInFrustum(bounds, frustum) {
          return !(
            bounds.x + bounds.width < frustum.left ||
            bounds.x > frustum.right ||
            bounds.y + bounds.height < frustum.top ||
            bounds.y > frustum.bottom ||
            bounds.zMax < frustum.near ||
            bounds.zMin > frustum.far
          );
        }

        calculateDistance(bounds, viewerZ) {
          const elementCenterZ = (bounds.zMin + bounds.zMax) / 2;
          return Math.abs(elementCenterZ - viewerZ);
        }

        calculateLODLevel(distance) {
          for (let i = 0; i < this.lodThresholds.length; i++) {
            if (distance <= this.lodThresholds[i]) {
              return i;
            }
          }
          return this.lodThresholds.length;
        }

        cull2D(elements, viewport) {
          const worldWidth = viewport.width / viewport.zoom;
          const worldHeight = viewport.height / viewport.zoom;
          const viewportBounds = {
            x: viewport.x - worldWidth / 2,
            y: viewport.y - worldHeight / 2,
            width: worldWidth,
            height: worldHeight,
          };
          
          const visibleElements = [];
          const culledElements = [];
          
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
            statistics: {
              totalElements: elements.length,
              frustumCulled: culledElements.length,
              occlusionCulled: 0,
              visibleElements: visibleElements.length,
            },
          };
        }

        boundsIntersect(bounds1, bounds2) {
          return !(
            bounds1.x + bounds1.width < bounds2.x ||
            bounds1.x > bounds2.x + bounds2.width ||
            bounds1.y + bounds1.height < bounds2.y ||
            bounds1.y > bounds2.y + bounds2.height
          );
        }
      }

      // Worker message handler
      self.onmessage = function(event) {
        const { requestId, type, elements, viewport, options } = event.data;
        
        if (type === 'cull') {
          const culler = new FastCuller(options);
          const result = culler.cull(elements, viewport);
          
          self.postMessage({
            requestId,
            result,
          });
        }
      };
    `;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingCallbacks.clear();
  }
}