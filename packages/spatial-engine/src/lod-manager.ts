import type { SpatialElement, LODLevel } from './types.js';

export class LODManager {
  private lodLevels: Map<number, LODLevel> = new Map([
    [
      0.001,
      {
        geometry: 'simplified',
        labels: false,
        metadata: false,
        interactions: false,
        children: false,
      },
    ],
    [
      0.1,
      {
        geometry: 'simplified',
        labels: true,
        metadata: false,
        interactions: false,
        children: false,
      },
    ],
    [
      1,
      {
        geometry: 'medium',
        labels: true,
        metadata: true,
        interactions: true,
        children: true,
      },
    ],
    [
      10,
      {
        geometry: 'full',
        labels: true,
        metadata: true,
        interactions: true,
        children: true,
      },
    ],
  ]);

  applyLOD(elements: SpatialElement[], zoomLevel: number): SpatialElement[] {
    const lodLevel = this.getLODLevel(zoomLevel);

    return elements
      .map(element => this.applyLODToElement(element, lodLevel, zoomLevel))
      .filter(Boolean) as SpatialElement[];
  }

  private getLODLevel(zoomLevel: number): LODLevel {
    const sortedLevels = Array.from(this.lodLevels.keys()).sort((a, b) => b - a);

    for (const threshold of sortedLevels) {
      if (zoomLevel >= threshold) {
        return this.lodLevels.get(threshold)!;
      }
    }

    return this.lodLevels.get(sortedLevels[sortedLevels.length - 1])!;
  }

  private applyLODToElement(
    element: SpatialElement,
    lodLevel: LODLevel,
    zoomLevel: number
  ): SpatialElement | null {
    const elementSize = Math.max(element.bounds.width, element.bounds.height) * zoomLevel;

    if (elementSize < 1) {
      return null;
    }

    const lodElement: SpatialElement = {
      ...element,
      lodLevel: this.calculateElementLOD(elementSize),
    };

    if (lodLevel.children && element.children) {
      lodElement.children = element.children
        .map(child => this.applyLODToElement(child, lodLevel, zoomLevel))
        .filter(Boolean) as SpatialElement[];
    } else {
      lodElement.children = undefined;
    }

    if (!lodLevel.interactions) {
      lodElement.data = {
        ...lodElement.data,
        interactions: undefined,
      };
    }

    return lodElement;
  }

  private calculateElementLOD(screenSize: number): number {
    if (screenSize < 5) return 0; // Minimal detail
    if (screenSize < 20) return 1; // Low detail
    if (screenSize < 100) return 2; // Medium detail
    return 3; // Full detail
  }

  setCustomLODLevel(zoomThreshold: number, lodLevel: LODLevel): void {
    this.lodLevels.set(zoomThreshold, lodLevel);
  }

  removeLODLevel(zoomThreshold: number): void {
    this.lodLevels.delete(zoomThreshold);
  }

  getAllLODLevels(): Map<number, LODLevel> {
    return new Map(this.lodLevels);
  }
}