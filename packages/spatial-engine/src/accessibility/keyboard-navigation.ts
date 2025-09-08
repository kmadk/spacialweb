/**
 * Keyboard navigation system for spatial engine accessibility
 * Provides comprehensive keyboard controls and focus management
 */

import type { SpatialElement, Viewport } from '../types.js';

export interface KeyboardNavigationOptions {
  panSpeed: number;
  zoomSpeed: number;
  focusRingColor: string;
  focusRingWidth: number;
  announceLiveRegion: boolean;
  enableSpatialAudio: boolean;
}

export interface KeyboardShortcuts {
  [key: string]: {
    action: string;
    description: string;
    handler: (event: KeyboardEvent) => void;
    category: 'navigation' | 'zoom' | 'focus' | 'accessibility';
  };
}

export interface FocusableElement extends SpatialElement {
  tabIndex?: number;
  ariaLabel?: string;
  ariaDescription?: string;
  role?: string;
}

export class KeyboardNavigationManager {
  private engine: any; // SpatialEngine reference
  private options: KeyboardNavigationOptions;
  private shortcuts: KeyboardShortcuts = {};
  private focusedElementId: string | null = null;
  private focusHistory: string[] = [];
  private isEnabled = true;
  private liveRegion: HTMLElement;
  private focusIndicator: HTMLElement;

  // Navigation state
  private panState = { up: false, down: false, left: false, right: false };
  private animationFrameId: number | null = null;

  constructor(engine: any, options: Partial<KeyboardNavigationOptions> = {}) {
    this.engine = engine;
    this.options = {
      panSpeed: 200, // pixels per second
      zoomSpeed: 1.5,
      focusRingColor: '#005fcc',
      focusRingWidth: 3,
      announceLiveRegion: true,
      enableSpatialAudio: false,
      ...options,
    };

    this.setupAccessibilityElements();
    this.setupKeyboardShortcuts();
    this.bindEventListeners();
  }

  /**
   * Enable keyboard navigation
   */
  public enable(): void {
    this.isEnabled = true;
    this.bindEventListeners();
    this.announce('Keyboard navigation enabled');
  }

  /**
   * Disable keyboard navigation
   */
  public disable(): void {
    this.isEnabled = false;
    this.unbindEventListeners();
    this.stopContinuousPan();
    this.announce('Keyboard navigation disabled');
  }

  /**
   * Focus on a specific element
   */
  public focusElement(elementId: string): boolean {
    const element = this.engine.findElement(elementId);
    if (!element) return false;

    // Update focus history
    if (this.focusedElementId) {
      this.focusHistory.push(this.focusedElementId);
      if (this.focusHistory.length > 50) {
        this.focusHistory.shift();
      }
    }

    this.focusedElementId = elementId;
    
    // Navigate to element
    this.engine.flyTo(elementId, { duration: 500 });
    
    // Update visual indicators
    this.updateFocusIndicator(element);
    
    // Announce to screen readers
    this.announceElementFocus(element);
    
    // Trigger custom event
    this.engine.emit('elementFocused', { element, previousElement: this.focusHistory[this.focusHistory.length - 1] });

    return true;
  }

  /**
   * Get current focused element
   */
  public getFocusedElement(): FocusableElement | null {
    return this.focusedElementId ? this.engine.findElement(this.focusedElementId) : null;
  }

  /**
   * Navigate to next focusable element
   */
  public focusNext(): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentIndex = this.focusedElementId 
      ? focusableElements.findIndex(el => el.id === this.focusedElementId)
      : -1;
    
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    this.focusElement(focusableElements[nextIndex].id);
  }

  /**
   * Navigate to previous focusable element
   */
  public focusPrevious(): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentIndex = this.focusedElementId 
      ? focusableElements.findIndex(el => el.id === this.focusedElementId)
      : 0;
    
    const prevIndex = currentIndex <= 0 
      ? focusableElements.length - 1 
      : currentIndex - 1;
    
    this.focusElement(focusableElements[prevIndex].id);
  }

  /**
   * Go back in focus history
   */
  public focusPrevious(): void {
    if (this.focusHistory.length > 0) {
      const previousElementId = this.focusHistory.pop()!;
      const temp = this.focusedElementId;
      this.focusedElementId = previousElementId;
      
      if (temp) {
        this.focusHistory.push(temp);
      }
      
      this.focusElement(previousElementId);
    }
  }

  /**
   * Get help information for keyboard shortcuts
   */
  public getKeyboardHelp(): string {
    const categories = {
      navigation: 'Navigation',
      zoom: 'Zoom Controls',
      focus: 'Focus Management',
      accessibility: 'Accessibility'
    };

    let help = 'Spatial Engine Keyboard Shortcuts:\n\n';
    
    for (const [category, title] of Object.entries(categories)) {
      const shortcuts = Object.entries(this.shortcuts)
        .filter(([_, shortcut]) => shortcut.category === category);
      
      if (shortcuts.length > 0) {
        help += `${title}:\n`;
        shortcuts.forEach(([key, shortcut]) => {
          help += `  ${key}: ${shortcut.description}\n`;
        });
        help += '\n';
      }
    }

    return help;
  }

  private setupAccessibilityElements(): void {
    // Create live region for announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);

    // Create focus indicator
    this.focusIndicator = document.createElement('div');
    this.focusIndicator.style.position = 'absolute';
    this.focusIndicator.style.pointerEvents = 'none';
    this.focusIndicator.style.border = `${this.options.focusRingWidth}px solid ${this.options.focusRingColor}`;
    this.focusIndicator.style.borderRadius = '4px';
    this.focusIndicator.style.display = 'none';
    this.focusIndicator.style.zIndex = '10000';
    this.focusIndicator.style.transition = 'all 0.2s ease';
    document.body.appendChild(this.focusIndicator);
  }

  private setupKeyboardShortcuts(): void {
    // Navigation shortcuts
    this.shortcuts['ArrowUp'] = {
      action: 'pan-up',
      description: 'Pan up',
      category: 'navigation',
      handler: (e) => this.handlePanKey('up', e.type === 'keydown'),
    };

    this.shortcuts['ArrowDown'] = {
      action: 'pan-down',
      description: 'Pan down',
      category: 'navigation',
      handler: (e) => this.handlePanKey('down', e.type === 'keydown'),
    };

    this.shortcuts['ArrowLeft'] = {
      action: 'pan-left',
      description: 'Pan left',
      category: 'navigation',
      handler: (e) => this.handlePanKey('left', e.type === 'keydown'),
    };

    this.shortcuts['ArrowRight'] = {
      action: 'pan-right',
      description: 'Pan right',
      category: 'navigation',
      handler: (e) => this.handlePanKey('right', e.type === 'keydown'),
    };

    // Zoom shortcuts
    this.shortcuts['+'] = {
      action: 'zoom-in',
      description: 'Zoom in',
      category: 'zoom',
      handler: () => this.handleZoom(this.options.zoomSpeed),
    };

    this.shortcuts['='] = {
      action: 'zoom-in',
      description: 'Zoom in',
      category: 'zoom',
      handler: () => this.handleZoom(this.options.zoomSpeed),
    };

    this.shortcuts['-'] = {
      action: 'zoom-out',
      description: 'Zoom out',
      category: 'zoom',
      handler: () => this.handleZoom(1 / this.options.zoomSpeed),
    };

    this.shortcuts['0'] = {
      action: 'reset-zoom',
      description: 'Reset zoom to 100%',
      category: 'zoom',
      handler: () => this.handleResetZoom(),
    };

    // Focus management
    this.shortcuts['Tab'] = {
      action: 'focus-next',
      description: 'Focus next element',
      category: 'focus',
      handler: (e) => {
        e.preventDefault();
        if (e.shiftKey) {
          this.focusPrevious();
        } else {
          this.focusNext();
        }
      },
    };

    this.shortcuts['Enter'] = {
      action: 'activate',
      description: 'Activate focused element',
      category: 'focus',
      handler: () => this.handleActivate(),
    };

    this.shortcuts[' '] = {
      action: 'activate',
      description: 'Activate focused element',
      category: 'focus',
      handler: (e) => {
        e.preventDefault();
        this.handleActivate();
      },
    };

    this.shortcuts['Escape'] = {
      action: 'clear-focus',
      description: 'Clear focus and return to overview',
      category: 'focus',
      handler: () => this.handleEscape(),
    };

    this.shortcuts['Home'] = {
      action: 'go-to-start',
      description: 'Go to first element',
      category: 'focus',
      handler: () => this.handleHome(),
    };

    this.shortcuts['End'] = {
      action: 'go-to-end',
      description: 'Go to last element',
      category: 'focus',
      handler: () => this.handleEnd(),
    };

    // Accessibility shortcuts
    this.shortcuts['?'] = {
      action: 'show-help',
      description: 'Show keyboard shortcuts help',
      category: 'accessibility',
      handler: () => this.showKeyboardHelp(),
    };

    this.shortcuts['Alt+d'] = {
      action: 'describe-viewport',
      description: 'Describe current viewport contents',
      category: 'accessibility',
      handler: () => this.describeViewport(),
    };

    this.shortcuts['Alt+s'] = {
      action: 'spatial-summary',
      description: 'Get spatial overview summary',
      category: 'accessibility',
      handler: () => this.provideSpatialSummary(),
    };
  }

  private bindEventListeners(): void {
    if (!this.isEnabled) return;

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    
    // Focus management
    this.engine.container.setAttribute('tabindex', '-1');
    this.engine.container.addEventListener('focus', this.handleContainerFocus);
    this.engine.container.addEventListener('blur', this.handleContainerBlur);
  }

  private unbindEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.engine.container.removeEventListener('focus', this.handleContainerFocus);
    this.engine.container.removeEventListener('blur', this.handleContainerBlur);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    const key = this.getKeyString(event);
    const shortcut = this.shortcuts[key];

    if (shortcut) {
      event.preventDefault();
      shortcut.handler(event);
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    // Handle key release for continuous actions
    if (event.key.startsWith('Arrow')) {
      const direction = event.key.replace('Arrow', '').toLowerCase() as keyof typeof this.panState;
      this.panState[direction] = false;
      
      // Stop continuous pan if no keys are pressed
      if (!Object.values(this.panState).some(Boolean)) {
        this.stopContinuousPan();
      }
    }
  };

  private handleContainerFocus = (): void => {
    if (!this.focusedElementId && this.engine.getElements().length > 0) {
      this.focusNext(); // Focus first element
    }
  };

  private handleContainerBlur = (): void => {
    this.hideFocusIndicator();
  };

  private handlePanKey(direction: keyof typeof this.panState, isPressed: boolean): void {
    this.panState[direction] = isPressed;
    
    if (isPressed && !this.animationFrameId) {
      this.startContinuousPan();
    }
  }

  private startContinuousPan(): void {
    if (this.animationFrameId) return;

    let lastTime = performance.now();
    
    const panStep = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const viewport = this.engine.getViewport();
      const panDistance = this.options.panSpeed * deltaTime / viewport.zoom;

      let deltaX = 0;
      let deltaY = 0;

      if (this.panState.left) deltaX -= panDistance;
      if (this.panState.right) deltaX += panDistance;
      if (this.panState.up) deltaY -= panDistance;
      if (this.panState.down) deltaY += panDistance;

      if (deltaX !== 0 || deltaY !== 0) {
        this.engine.setViewport({
          ...viewport,
          x: viewport.x + deltaX,
          y: viewport.y + deltaY,
        }, { duration: 0 });

        this.announce(`Panned ${deltaX !== 0 ? (deltaX > 0 ? 'right' : 'left') : ''} ${deltaY !== 0 ? (deltaY > 0 ? 'down' : 'up') : ''}`, false);
      }

      if (Object.values(this.panState).some(Boolean)) {
        this.animationFrameId = requestAnimationFrame(panStep);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(panStep);
  }

  private stopContinuousPan(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleZoom(factor: number): void {
    const viewport = this.engine.getViewport();
    const newZoom = Math.max(0.001, Math.min(1000, viewport.zoom * factor));
    
    this.engine.setViewport({
      ...viewport,
      zoom: newZoom,
    });

    this.announce(`Zoomed ${factor > 1 ? 'in' : 'out'} to ${Math.round(newZoom * 100)}%`);
  }

  private handleResetZoom(): void {
    const viewport = this.engine.getViewport();
    this.engine.setViewport({
      ...viewport,
      zoom: 1,
    });
    this.announce('Zoom reset to 100%');
  }

  private handleActivate(): void {
    const focusedElement = this.getFocusedElement();
    if (!focusedElement) return;

    // Trigger click event
    this.engine.emit('elementClick', { 
      element: focusedElement, 
      event: { type: 'keyboard-activate' } 
    });

    this.announce(`Activated ${this.getElementDescription(focusedElement)}`);
  }

  private handleEscape(): void {
    if (this.focusedElementId) {
      this.focusedElementId = null;
      this.hideFocusIndicator();
      this.engine.resetViewport();
      this.announce('Focus cleared, returned to overview');
    }
  }

  private handleHome(): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length > 0) {
      this.focusElement(focusableElements[0].id);
    }
  }

  private handleEnd(): void {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length > 0) {
      this.focusElement(focusableElements[focusableElements.length - 1].id);
    }
  }

  private showKeyboardHelp(): void {
    const help = this.getKeyboardHelp();
    this.announce('Keyboard shortcuts: ' + help.replace(/\n/g, '. '));
    console.log(help); // Also log to console for detailed reference
  }

  private describeViewport(): void {
    const viewport = this.engine.getViewport();
    const visibleElements = this.engine.getElementsInRegion({
      x: viewport.x - viewport.width / (2 * viewport.zoom),
      y: viewport.y - viewport.height / (2 * viewport.zoom),
      width: viewport.width / viewport.zoom,
      height: viewport.height / viewport.zoom,
    });

    const description = `Current viewport: ${Math.round(viewport.zoom * 100)}% zoom, centered at ${Math.round(viewport.x)}, ${Math.round(viewport.y)}. ${visibleElements.length} elements visible.`;
    this.announce(description);
  }

  private provideSpatialSummary(): void {
    const allElements = this.engine.getElements();
    const viewport = this.engine.getViewport();
    const bounds = this.calculateBounds(allElements);
    
    const summary = `Spatial overview: ${allElements.length} total elements. Content spans from ${Math.round(bounds.x)}, ${Math.round(bounds.y)} to ${Math.round(bounds.x + bounds.width)}, ${Math.round(bounds.y + bounds.height)}. Currently viewing ${Math.round(viewport.zoom * 100)}% zoom.`;
    this.announce(summary);
  }

  private getFocusableElements(): FocusableElement[] {
    return this.engine.getElements().filter((element: FocusableElement) => {
      return element.tabIndex !== -1; // Elements with tabIndex -1 are not focusable
    });
  }

  private updateFocusIndicator(element: SpatialElement): void {
    const viewport = this.engine.getViewport();
    
    // Calculate screen position
    const screenX = (element.bounds.x - viewport.x) * viewport.zoom + viewport.width / 2;
    const screenY = (element.bounds.y - viewport.y) * viewport.zoom + viewport.height / 2;
    const screenWidth = element.bounds.width * viewport.zoom;
    const screenHeight = element.bounds.height * viewport.zoom;

    this.focusIndicator.style.left = `${screenX}px`;
    this.focusIndicator.style.top = `${screenY}px`;
    this.focusIndicator.style.width = `${screenWidth}px`;
    this.focusIndicator.style.height = `${screenHeight}px`;
    this.focusIndicator.style.display = 'block';
  }

  private hideFocusIndicator(): void {
    this.focusIndicator.style.display = 'none';
  }

  private announceElementFocus(element: FocusableElement): void {
    const description = this.getElementDescription(element);
    this.announce(`Focused: ${description}`);
  }

  private getElementDescription(element: FocusableElement): string {
    if (element.ariaLabel) return element.ariaLabel;
    if (element.ariaDescription) return element.ariaDescription;
    
    const type = element.type || 'element';
    const position = `at ${Math.round(element.bounds.x)}, ${Math.round(element.bounds.y)}`;
    const size = `${Math.round(element.bounds.width)} by ${Math.round(element.bounds.height)} pixels`;
    
    return `${type} ${position}, ${size}`;
  }

  private announce(message: string, interrupt = true): void {
    if (!this.options.announceLiveRegion) return;

    if (interrupt) {
      this.liveRegion.setAttribute('aria-live', 'assertive');
    } else {
      this.liveRegion.setAttribute('aria-live', 'polite');
    }

    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 100);
  }

  private getKeyString(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey && event.key !== 'Tab') parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }

  private calculateBounds(elements: SpatialElement[]) {
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

  public destroy(): void {
    this.unbindEventListeners();
    this.stopContinuousPan();
    
    if (this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
    
    if (this.focusIndicator.parentNode) {
      this.focusIndicator.parentNode.removeChild(this.focusIndicator);
    }
  }
}