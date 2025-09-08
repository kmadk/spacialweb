import JSZip from 'jszip';
import imageSize from 'image-size';
import type {
  PenpotFile,
  PenpotPage,
  PenpotElement,
  PenpotComponent,
  PenpotAsset,
  ElementType,
  ElementStyles,
  BoundingBox,
  Interaction,
  DataBinding,
  DesignTokens,
  FileMetadata,
  FillStyle,
  StrokeStyle,
  TypographyStyle,
  LayoutStyle,
  Effect,
} from './types.js';

export class PenpotParser {
  private zip: JSZip | null = null;
  private assets: Map<string, ArrayBuffer> = new Map();

  async parseFile(zipFile: File): Promise<PenpotFile> {
    this.zip = await JSZip.loadAsync(zipFile);

    const dataFile = this.zip.file('data.json');
    if (!dataFile) {
      throw new Error('Invalid Penpot file: missing data.json');
    }

    const rawData = JSON.parse(await dataFile.async('text'));

    await this.loadAssets();

    return this.transformToStandardFormat(rawData);
  }

  private async loadAssets(): Promise<void> {
    const assetFolder = this.zip!.folder('assets');
    if (!assetFolder) return;

    const promises: Promise<void>[] = [];

    assetFolder.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        promises.push(
          zipEntry.async('arraybuffer').then(buffer => {
            this.assets.set(relativePath, buffer);
          })
        );
      }
    });

    await Promise.all(promises);
  }

  private transformToStandardFormat(rawData: any): PenpotFile {
    return {
      version: rawData.version || '1.0.0',
      pages: this.transformPages(rawData.pages || []),
      components: this.transformComponents(rawData.components || []),
      assets: this.transformAssets(rawData.assets || []),
      tokens: this.extractDesignTokens(rawData),
      metadata: this.extractMetadata(rawData),
    };
  }

  private transformPages(rawPages: any[]): PenpotPage[] {
    return rawPages.map(page => ({
      id: page.id,
      name: page.name,
      elements: this.transformElements(page.objects || []),
      bounds: this.calculatePageBounds(page.objects || []),
    }));
  }

  private transformComponents(rawComponents: any[]): PenpotComponent[] {
    return rawComponents.map(component => ({
      id: component.id,
      name: component.name,
      elements: this.transformElements(component.objects || []),
      bounds: this.calculatePageBounds(component.objects || []),
    }));
  }

  private transformElements(rawObjects: any[]): PenpotElement[] {
    return rawObjects
      .filter(obj => obj.type !== 'frame' || obj.shapes?.length > 0)
      .map(obj => this.transformElement(obj));
  }

  private transformElement(rawElement: any): PenpotElement {
    const element: PenpotElement = {
      id: rawElement.id,
      name: rawElement.name || `Element ${rawElement.id}`,
      type: this.mapElementType(rawElement.type),
      bounds: {
        x: rawElement.selrect?.[0] || 0,
        y: rawElement.selrect?.[1] || 0,
        width: rawElement.selrect?.[2] || 0,
        height: rawElement.selrect?.[3] || 0,
      },
      styles: this.transformStyles(rawElement),
    };

    if (rawElement.shapes?.length > 0) {
      element.children = rawElement.shapes.map(shape => this.transformElement(shape));
    }

    if (rawElement.interactions?.length > 0) {
      element.interactions = this.transformInteractions(rawElement.interactions);
    }

    if (rawElement.dataBinding) {
      element.data = this.transformDataBinding(rawElement.dataBinding);
    }

    return element;
  }

  private mapElementType(penpotType: string): ElementType {
    const typeMap: Record<string, ElementType> = {
      rect: 'rectangle',
      circle: 'circle',
      text: 'text',
      image: 'image',
      group: 'group',
      frame: 'frame',
      component: 'component',
      instance: 'instance',
    };

    return typeMap[penpotType] || 'unknown';
  }

  private transformStyles(rawElement: any): ElementStyles {
    const styles: ElementStyles = {};

    if (rawElement.fill) {
      styles.fill = this.transformFillStyle(rawElement.fill);
    }

    if (rawElement.stroke) {
      styles.stroke = this.transformStrokeStyle(rawElement.stroke);
    }

    if (rawElement.content) {
      styles.typography = this.transformTypographyStyle(rawElement.content);
    }

    if (rawElement.layout) {
      styles.layout = this.transformLayoutStyle(rawElement.layout);
    }

    if (rawElement.shadow || rawElement.blur) {
      styles.effects = this.transformEffects(rawElement);
    }

    return styles;
  }

  private transformFillStyle(rawFill: any): FillStyle {
    if (rawFill.type === 'solid') {
      return {
        type: 'solid',
        color: rawFill.color,
        opacity: rawFill.opacity,
      };
    }

    return {
      type: 'solid',
      color: '#000000',
      opacity: 1,
    };
  }

  private transformStrokeStyle(rawStroke: any): StrokeStyle {
    return {
      color: rawStroke.color || '#000000',
      width: rawStroke.width || 1,
      opacity: rawStroke.opacity || 1,
      style: rawStroke.style || 'solid',
    };
  }

  private transformTypographyStyle(rawContent: any): TypographyStyle {
    return {
      fontFamily: rawContent.fontFamily || 'Inter',
      fontSize: rawContent.fontSize || 16,
      fontWeight: rawContent.fontWeight || 400,
      lineHeight: rawContent.lineHeight,
      letterSpacing: rawContent.letterSpacing,
      textAlign: rawContent.textAlign || 'left',
      color: rawContent.color || '#000000',
      textDecoration: rawContent.textDecoration || 'none',
    };
  }

  private transformLayoutStyle(rawLayout: any): LayoutStyle {
    return {
      display: rawLayout.display,
      flexDirection: rawLayout.flexDirection,
      justifyContent: rawLayout.justifyContent,
      alignItems: rawLayout.alignItems,
      gap: rawLayout.gap,
      padding: rawLayout.padding,
      margin: rawLayout.margin,
    };
  }

  private transformEffects(rawElement: any): Effect[] {
    const effects: Effect[] = [];

    if (rawElement.shadow) {
      effects.push({
        type: 'shadow',
        blur: rawElement.shadow.blur || 0,
        color: rawElement.shadow.color || '#000000',
        offset: {
          x: rawElement.shadow.offsetX || 0,
          y: rawElement.shadow.offsetY || 0,
        },
        opacity: rawElement.shadow.opacity || 1,
      });
    }

    if (rawElement.blur) {
      effects.push({
        type: 'blur',
        blur: rawElement.blur.radius || 0,
      });
    }

    return effects;
  }

  private transformInteractions(rawInteractions: any[]): Interaction[] {
    return rawInteractions.map(interaction => ({
      trigger: this.mapTriggerType(interaction.trigger),
      action: this.transformAction(interaction.action),
      target: interaction.destination?.id,
      parameters: interaction.parameters || {},
    }));
  }

  private mapTriggerType(trigger: string): 'click' | 'hover' | 'submit' | 'change' {
    const triggerMap: Record<string, 'click' | 'hover' | 'submit' | 'change'> = {
      click: 'click',
      hover: 'hover',
      submit: 'submit',
      change: 'change',
    };

    return triggerMap[trigger] || 'click';
  }

  private transformAction(rawAction: any): Interaction['action'] {
    return {
      type: rawAction.type || 'navigate',
      target: rawAction.target,
      url: rawAction.url,
      endpoint: rawAction.endpoint,
      parameters: rawAction.parameters || {},
    };
  }

  private transformDataBinding(rawBinding: any): DataBinding {
    return {
      source: rawBinding.source || 'static',
      endpoint: rawBinding.endpoint,
      transforms: rawBinding.transforms || [],
      fallback: rawBinding.fallback,
    };
  }

  private transformAssets(rawAssets: any[]): PenpotAsset[] {
    return rawAssets.map(asset => {
      const assetData = this.assets.get(asset.path);
      let metadata: PenpotAsset['metadata'] = undefined;

      if (assetData && asset.type === 'image') {
        try {
          const dimensions = imageSize(Buffer.from(assetData));
          metadata = {
            width: dimensions.width,
            height: dimensions.height,
            format: dimensions.type,
            size: assetData.byteLength,
          };
        } catch (error) {
          console.warn(`Failed to get image dimensions for ${asset.path}:`, error);
        }
      }

      return {
        id: asset.id,
        name: asset.name,
        type: asset.type || 'image',
        path: asset.path,
        data: assetData,
        metadata,
      };
    });
  }

  private extractDesignTokens(rawData: any): DesignTokens {
    return {
      colors: rawData.tokens?.colors || {},
      typography: rawData.tokens?.typography || {},
      spacing: rawData.tokens?.spacing || {},
      shadows: rawData.tokens?.shadows || {},
    };
  }

  private extractMetadata(rawData: any): FileMetadata {
    return {
      createdAt: rawData.createdAt || new Date().toISOString(),
      updatedAt: rawData.updatedAt || new Date().toISOString(),
      author: rawData.author,
      version: rawData.version || '1.0.0',
      totalElements: this.countElements(rawData.pages || []),
      totalPages: rawData.pages?.length || 0,
      fileSize: 0, // Will be set externally
    };
  }

  private countElements(pages: any[]): number {
    return pages.reduce((total, page) => {
      return total + (page.objects?.length || 0);
    }, 0);
  }

  private calculatePageBounds(objects: any[]): BoundingBox {
    if (objects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const obj of objects) {
      if (obj.selrect) {
        const [x, y, width, height] = obj.selrect;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }
    }

    return {
      x: minX === Infinity ? 0 : minX,
      y: minY === Infinity ? 0 : minY,
      width: maxX === -Infinity ? 0 : maxX - minX,
      height: maxY === -Infinity ? 0 : maxY - minY,
    };
  }

  getAsset(path: string): ArrayBuffer | null {
    return this.assets.get(path) || null;
  }

  getAssetAsBlob(path: string, mimeType: string): Blob | null {
    const buffer = this.getAsset(path);
    if (!buffer) return null;

    return new Blob([buffer], { type: mimeType });
  }

  getAssetAsDataURL(path: string, mimeType: string): string | null {
    const blob = this.getAssetAsBlob(path, mimeType);
    if (!blob) return null;

    return URL.createObjectURL(blob);
  }
}