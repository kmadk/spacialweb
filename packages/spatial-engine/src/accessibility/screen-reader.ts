/**
 * Screen reader accessibility support for spatial navigation
 * Provides rich descriptions and spatial context for assistive technology
 */

import type { SpatialElement, Viewport } from '../types.js';

export interface ScreenReaderOptions {
  verbosity: 'minimal' | 'normal' | 'verbose';
  announceViewportChanges: boolean;
  announceElementCounts: boolean;
  spatialDescriptions: boolean;
  landmarkNavigation: boolean;
  language: string;
}

export interface AccessibleElement extends SpatialElement {
  ariaLabel?: string;
  ariaDescription?: string;
  role?: string;
  landmark?: string;
  heading?: { level: number; text: string };
}

export class ScreenReaderSupport {
  private engine: any;
  private options: ScreenReaderOptions;
  private ariaContainer: HTMLElement;
  private announcements: HTMLElement;
  private elementDescriptions: Map<string, string> = new Map();
  private lastAnnouncedViewport: Viewport | null = null;

  constructor(engine: any, options: Partial<ScreenReaderOptions> = {}) {
    this.engine = engine;
    this.options = {
      verbosity: 'normal',
      announceViewportChanges: true,
      announceElementCounts: true,
      spatialDescriptions: true,
      landmarkNavigation: true,
      language: 'en',
      ...options,
    };

    this.setupAccessibilityStructure();
    this.bindEngineEvents();
  }

  /**
   * Generate comprehensive description of the current viewport
   */
  public describeCurrentViewport(): string {
    const viewport = this.engine.getViewport();
    const visibleElements = this.getVisibleElements();
    
    let description = '';

    // Basic viewport info
    if (this.options.verbosity !== 'minimal') {
      description += `Viewing at ${Math.round(viewport.zoom * 100)}% zoom. `;
    }

    // Element count
    if (this.options.announceElementCounts) {
      description += `${visibleElements.length} items visible. `;
    }

    // Spatial layout description
    if (this.options.spatialDescriptions && visibleElements.length > 0) {
      const layout = this.analyzeLayout(visibleElements);
      description += layout + ' ';
    }

    // Landmarks and important elements
    const landmarks = this.identifyLandmarks(visibleElements);
    if (landmarks.length > 0) {
      description += `Landmarks: ${landmarks.join(', ')}. `;
    }

    return description.trim();
  }

  /**
   * Provide detailed description of a specific element
   */
  public describeElement(element: AccessibleElement): string {
    let description = '';

    // Element type and role
    if (element.role) {
      description += `${element.role} `;
    } else {
      description += `${element.type || 'element'} `;
    }

    // Custom label or description
    if (element.ariaLabel) {
      description += `"${element.ariaLabel}" `;
    } else if (element.ariaDescription) {
      description += `"${element.ariaDescription}" `;
    }

    // Heading information
    if (element.heading) {
      description += `heading level ${element.heading.level}, "${element.heading.text}" `;
    }

    // Spatial information
    if (this.options.spatialDescriptions) {
      const position = this.describeSpatialPosition(element);
      description += position + ' ';
    }

    // Size information for verbose mode
    if (this.options.verbosity === 'verbose') {
      const size = `${Math.round(element.bounds.width)} by ${Math.round(element.bounds.height)} pixels`;
      description += `Size: ${size}. `;
    }

    // Content or style information
    const content = this.extractElementContent(element);
    if (content) {
      description += content + ' ';
    }

    return description.trim();
  }

  /**
   * Generate spatial navigation instructions
   */
  public provideNavigationHelp(): string {
    const elements = this.engine.getElements();
    const bounds = this.calculateContentBounds(elements);
    
    let help = 'Spatial navigation help: ';
    
    if (elements.length === 0) {
      return help + 'No content available.';
    }

    help += `Content area spans ${Math.round(bounds.width)} by ${Math.round(bounds.height)} pixels. `;
    
    // Directional navigation hints
    const viewport = this.engine.getViewport();
    const directions = [];
    
    if (viewport.x > bounds.x) directions.push('west');
    if (viewport.x < bounds.x + bounds.width) directions.push('east');
    if (viewport.y > bounds.y) directions.push('north');
    if (viewport.y < bounds.y + bounds.height) directions.push('south');
    
    if (directions.length > 0) {
      help += `More content available to the ${directions.join(' and ')}. `;
    }

    // Keyboard shortcuts
    help += 'Use arrow keys to pan, plus and minus to zoom, tab to navigate between elements.';
    
    return help;
  }

  /**
   * Create accessible summary of spatial relationships
   */
  public describeSpatialRelationships(elementId: string): string {
    const element = this.engine.findElement(elementId);
    if (!element) return '';

    const allElements = this.engine.getElements();
    const nearby = this.findNearbyElements(element, allElements);
    
    let description = '';

    if (nearby.above.length > 0) {
      description += `Above: ${nearby.above.map(el => this.getElementLabel(el)).join(', ')}. `;
    }

    if (nearby.below.length > 0) {
      description += `Below: ${nearby.below.map(el => this.getElementLabel(el)).join(', ')}. `;
    }

    if (nearby.left.length > 0) {
      description += `To the left: ${nearby.left.map(el => this.getElementLabel(el)).join(', ')}. `;
    }

    if (nearby.right.length > 0) {
      description += `To the right: ${nearby.right.map(el => this.getElementLabel(el)).join(', ')}. `;
    }

    return description.trim();
  }

  /**
   * Announce viewport changes to screen readers
   */
  public announceViewportChange(newViewport: Viewport): void {
    if (!this.options.announceViewportChanges) return;

    const lastViewport = this.lastAnnouncedViewport;
    this.lastAnnouncedViewport = { ...newViewport };

    if (!lastViewport) {
      this.announce(this.describeCurrentViewport());
      return;
    }

    // Determine type of change
    const zoomChanged = Math.abs(newViewport.zoom - lastViewport.zoom) > 0.1;
    const panChanged = Math.abs(newViewport.x - lastViewport.x) > 50 || 
                      Math.abs(newViewport.y - lastViewport.y) > 50;

    let announcement = '';

    if (zoomChanged) {
      const zoomPercent = Math.round(newViewport.zoom * 100);
      announcement += `Zoomed to ${zoomPercent}%. `;
    }

    if (panChanged && this.options.verbosity !== 'minimal') {
      const direction = this.getPanDirection(lastViewport, newViewport);
      announcement += `Moved ${direction}. `;
    }

    if (this.options.announceElementCounts) {
      const visibleCount = this.getVisibleElements().length;
      announcement += `${visibleCount} items visible.`;
    }

    if (announcement) {
      this.announce(announcement);
    }
  }

  /**
   * Set up ARIA structure for the spatial engine
   */
  public setupAriaStructure(container: HTMLElement): void {
    // Main spatial container
    container.setAttribute('role', 'application');
    container.setAttribute('aria-label', 'Spatial navigation interface');
    container.setAttribute('aria-description', 'Interactive spatial content with zoom and pan capabilities');

    // Add keyboard instructions
    const instructions = document.createElement('div');
    instructions.id = 'spatial-instructions';
    instructions.style.position = 'absolute';
    instructions.style.left = '-10000px';
    instructions.textContent = 'Use arrow keys to pan, plus/minus to zoom, tab to navigate elements, question mark for help';
    container.appendChild(instructions);
    
    container.setAttribute('aria-describedby', 'spatial-instructions');

    // Create region for dynamic content descriptions
    this.ariaContainer = document.createElement('div');
    this.ariaContainer.setAttribute('role', 'region');
    this.ariaContainer.setAttribute('aria-label', 'Spatial content');
    this.ariaContainer.setAttribute('aria-live', 'polite');
    this.ariaContainer.style.position = 'absolute';
    this.ariaContainer.style.left = '-10000px';
    container.appendChild(this.ariaContainer);
  }

  /**
   * Update ARIA descriptions for visible elements
   */
  public updateAriaDescriptions(): void {
    const visibleElements = this.getVisibleElements();
    
    // Clear existing descriptions
    this.ariaContainer.innerHTML = '';

    // Add descriptions for visible elements
    visibleElements.forEach((element, index) => {
      const elementDiv = document.createElement('div');
      elementDiv.setAttribute('role', element.role || 'generic');
      elementDiv.id = `aria-${element.id}`;
      
      const description = this.describeElement(element as AccessibleElement);
      elementDiv.textContent = description;
      
      if (index === 0) {
        elementDiv.setAttribute('aria-current', 'location');
      }

      this.ariaContainer.appendChild(elementDiv);
    });
  }

  private setupAccessibilityStructure(): void {
    // Create announcement region
    this.announcements = document.createElement('div');
    this.announcements.setAttribute('aria-live', 'assertive');
    this.announcements.setAttribute('aria-atomic', 'true');
    this.announcements.style.position = 'absolute';
    this.announcements.style.left = '-10000px';
    this.announcements.style.width = '1px';
    this.announcements.style.height = '1px';
    this.announcements.style.overflow = 'hidden';
    document.body.appendChild(this.announcements);
  }

  private bindEngineEvents(): void {
    this.engine.on('viewportChange', (viewport: Viewport) => {
      this.announceViewportChange(viewport);
      this.updateAriaDescriptions();
    });

    this.engine.on('elementsChanged', () => {
      this.updateAriaDescriptions();
    });

    this.engine.on('elementFocused', ({ element }: { element: AccessibleElement }) => {
      const description = this.describeElement(element);
      const relationships = this.describeSpatialRelationships(element.id);
      this.announce(`${description} ${relationships}`);
    });
  }

  private getVisibleElements(): SpatialElement[] {
    const viewport = this.engine.getViewport();
    const padding = Math.max(viewport.width, viewport.height) / (viewport.zoom * 4);
    
    return this.engine.getElementsInRegion({
      x: viewport.x - viewport.width / (2 * viewport.zoom) - padding,
      y: viewport.y - viewport.height / (2 * viewport.zoom) - padding,
      width: viewport.width / viewport.zoom + padding * 2,
      height: viewport.height / viewport.zoom + padding * 2,
    });
  }

  private analyzeLayout(elements: SpatialElement[]): string {
    if (elements.length <= 1) return '';

    // Group elements by approximate position
    const rows = this.groupElementsByRows(elements);
    const columns = this.groupElementsByColumns(elements);

    if (rows.length > 1 && columns.length > 1) {
      return `Content arranged in approximately ${rows.length} rows and ${columns.length} columns`;
    } else if (rows.length > 1) {
      return `Content arranged vertically in ${rows.length} rows`;
    } else if (columns.length > 1) {
      return `Content arranged horizontally in ${columns.length} columns`;
    } else {
      return `Content clustered in single group`;
    }
  }

  private groupElementsByRows(elements: SpatialElement[]): SpatialElement[][] {
    const sorted = elements.sort((a, b) => a.bounds.y - b.bounds.y);
    const rows: SpatialElement[][] = [];
    let currentRow: SpatialElement[] = [];
    let lastY = -Infinity;

    for (const element of sorted) {
      if (element.bounds.y - lastY > 50) { // New row threshold
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [element];
        lastY = element.bounds.y;
      } else {
        currentRow.push(element);
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  private groupElementsByColumns(elements: SpatialElement[]): SpatialElement[][] {
    const sorted = elements.sort((a, b) => a.bounds.x - b.bounds.x);
    const columns: SpatialElement[][] = [];
    let currentColumn: SpatialElement[] = [];
    let lastX = -Infinity;

    for (const element of sorted) {
      if (element.bounds.x - lastX > 50) { // New column threshold
        if (currentColumn.length > 0) {
          columns.push(currentColumn);
        }
        currentColumn = [element];
        lastX = element.bounds.x;
      } else {
        currentColumn.push(element);
      }
    }

    if (currentColumn.length > 0) {
      columns.push(currentColumn);
    }

    return columns;
  }

  private identifyLandmarks(elements: SpatialElement[]): string[] {
    const landmarks: string[] = [];
    
    for (const element of elements) {
      const accessibleElement = element as AccessibleElement;
      if (accessibleElement.landmark) {
        landmarks.push(accessibleElement.landmark);
      } else if (accessibleElement.role) {
        if (['navigation', 'main', 'banner', 'contentinfo', 'complementary', 'search'].includes(accessibleElement.role)) {
          landmarks.push(accessibleElement.role);
        }
      }
    }
    
    return Array.from(new Set(landmarks)); // Remove duplicates
  }

  private describeSpatialPosition(element: SpatialElement): string {
    const viewport = this.engine.getViewport();
    const centerX = element.bounds.x + element.bounds.width / 2;
    const centerY = element.bounds.y + element.bounds.height / 2;
    
    // Determine relative position to viewport center
    const relativeX = centerX - viewport.x;
    const relativeY = centerY - viewport.y;
    
    const directions = [];
    
    if (Math.abs(relativeX) > 10) {
      directions.push(relativeX > 0 ? 'right of center' : 'left of center');
    }
    
    if (Math.abs(relativeY) > 10) {
      directions.push(relativeY > 0 ? 'below center' : 'above center');
    }
    
    if (directions.length === 0) {
      return 'centered in view';
    }
    
    return directions.join(' and ');
  }

  private extractElementContent(element: AccessibleElement): string {
    // Extract meaningful content from element styles or properties
    if (element.styles?.color) {
      return `Color: ${element.styles.color}`;
    }
    
    if (element.styles?.fontSize) {
      return `Font size: ${element.styles.fontSize}`;
    }
    
    return '';
  }

  private findNearbyElements(element: SpatialElement, allElements: SpatialElement[]) {
    const threshold = 100; // Pixel threshold for "nearby"
    const center = {
      x: element.bounds.x + element.bounds.width / 2,
      y: element.bounds.y + element.bounds.height / 2,
    };

    const nearby = {
      above: [] as SpatialElement[],
      below: [] as SpatialElement[],
      left: [] as SpatialElement[],
      right: [] as SpatialElement[],
    };

    for (const other of allElements) {
      if (other.id === element.id) continue;

      const otherCenter = {
        x: other.bounds.x + other.bounds.width / 2,
        y: other.bounds.y + other.bounds.height / 2,
      };

      const dx = otherCenter.x - center.x;
      const dy = otherCenter.y - center.y;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        if (dy < -10) nearby.above.push(other);
        else if (dy > 10) nearby.below.push(other);
        
        if (dx < -10) nearby.left.push(other);
        else if (dx > 10) nearby.right.push(other);
      }
    }

    return nearby;
  }

  private getElementLabel(element: AccessibleElement): string {
    return element.ariaLabel || element.id || element.type || 'element';
  }

  private getPanDirection(from: Viewport, to: Viewport): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    const horizontal = Math.abs(dx) > Math.abs(dy) ? 
      (dx > 0 ? 'right' : 'left') : '';
    const vertical = Math.abs(dy) > 10 ? 
      (dy > 0 ? 'down' : 'up') : '';
    
    if (horizontal && vertical) {
      return `${vertical} and ${horizontal}`;
    }
    return horizontal || vertical || 'slightly';
  }

  private calculateContentBounds(elements: SpatialElement[]) {
    if (elements.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

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

  private announce(message: string): void {
    this.announcements.textContent = message;
    
    // Clear announcement after brief delay
    setTimeout(() => {
      this.announcements.textContent = '';
    }, 100);
  }

  public destroy(): void {
    if (this.announcements.parentNode) {
      this.announcements.parentNode.removeChild(this.announcements);
    }
    
    if (this.ariaContainer && this.ariaContainer.parentNode) {
      this.ariaContainer.parentNode.removeChild(this.ariaContainer);
    }
  }
}