/**
 * Optimized Z-axis Navigation Controls
 * High-performance UI controls with batched DOM updates for 3D spatial navigation
 */

import type { SpatialEngine } from '../spatial-engine.js';
import type { ZNavigationOptions } from '../types.js';
import { 
  batchTextUpdate, 
  batchAttributeUpdate, 
  batchStyleUpdate, 
  getDOMScheduler,
  getStyleBatcher 
} from '../performance/dom-batch-scheduler.js';

interface ZControlsOptions {
  enableKeyboard?: boolean;
  enableMouse?: boolean;
  enableTouch?: boolean;
  enableUI?: boolean;
  keyboardSensitivity?: number;
  mouseSensitivity?: number;
  touchSensitivity?: number;
  showDepthIndicator?: boolean;
  showLayerList?: boolean;
  container?: HTMLElement;
}

interface ControlsState {
  isActive: boolean;
  isDragging: boolean;
  lastPointerY: number;
  keyboardNavigation: {
    forward: boolean;
    backward: boolean;
    fastMode: boolean;
  };
}

export class OptimizedZNavigationControls {
  private engine: SpatialEngine;
  private container: HTMLElement;
  private uiContainer: HTMLElement | null = null;
  private options: Required<ZControlsOptions>;
  private state: ControlsState;
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = [];
  
  // UI Elements
  private depthSlider: HTMLInputElement | null = null;
  private depthDisplay: HTMLElement | null = null;
  private layerList: HTMLElement | null = null;
  private controlPanel: HTMLElement | null = null;
  
  // Performance tracking
  private lastUpdateTime = 0;
  private updateThrottle = 16; // ~60fps throttling

  constructor(engine: SpatialEngine, options: ZControlsOptions = {}) {
    this.engine = engine;
    this.container = options.container ?? document.body;
    
    this.options = {
      enableKeyboard: true,
      enableMouse: true,
      enableTouch: true,
      enableUI: true,
      keyboardSensitivity: 10,
      mouseSensitivity: 0.5,
      touchSensitivity: 0.3,
      showDepthIndicator: true,
      showLayerList: true,
      container: this.container,
      ...options,
    };
    
    this.state = {
      isActive: true,
      isDragging: false,
      lastPointerY: 0,
      keyboardNavigation: {
        forward: false,
        backward: false,
        fastMode: false,
      },
    };
    
    if (!this.engine.is3D()) {
      console.warn('Z-Navigation controls require 3D mode to be enabled');
      return;
    }
    
    this.initialize();
  }
  
  private initialize(): void {
    if (this.options.enableUI) {
      this.createUI();
    }
    
    if (this.options.enableKeyboard) {
      this.setupKeyboardControls();
    }

    if (this.options.enableMouse) {
      this.setupMouseControls();
    }

    if (this.options.enableTouch) {
      this.setupTouchControls();
    }
    
    // Listen to engine events
    this.engine.on('zNavigationEnd', (data) => {
      this.updateUI(data.z);
    });
    
    // Listen to viewport changes for real-time updates
    this.engine.on('viewportChange', (viewport) => {
      if (viewport.z !== undefined) {
        this.updateUI(viewport.z);
      }
    });
    
    // Initial UI update
    this.updateUI(this.engine.getCurrentZ());
  }
  
  /**
   * Optimized UI Creation
   */
  private createUI(): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'z-navigation-controls';
    
    // Use style batcher for initial styles
    const styleBatcher = getStyleBatcher();
    styleBatcher.updateMultipleStyles(this.uiContainer, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '14px',
      zIndex: '1000',
      minWidth: '200px',
      backdropFilter: 'blur(10px)',
    }, 100); // High priority for initial setup
    
    this.createDepthControls();
    
    if (this.options.showLayerList) {
      this.createLayerList();
    }
    
    this.createActionButtons();
    this.createInstructions();
    
    this.container.appendChild(this.uiContainer);
  }
  
  private createDepthControls(): void {
    if (!this.uiContainer) return;
    
    if (this.options.showDepthIndicator) {
      const depthSection = document.createElement('div');
      const styleBatcher = getStyleBatcher();
      styleBatcher.updateStyle(depthSection, 'marginBottom', '16px', 90);
      
      const depthLabel = document.createElement('div');
      depthLabel.textContent = 'Depth:';
      styleBatcher.updateStyle(depthLabel, 'marginBottom', '8px', 90);
      
      this.depthDisplay = document.createElement('div');
      styleBatcher.updateMultipleStyles(this.depthDisplay, {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: '8px',
      }, 90);
      
      // Depth slider
      this.depthSlider = document.createElement('input');
      this.depthSlider.type = 'range';
      this.depthSlider.min = '-1000';
      this.depthSlider.max = '1000';
      this.depthSlider.value = '0';
      this.depthSlider.step = '1';
      
      styleBatcher.updateMultipleStyles(this.depthSlider, {
        width: '100%',
        margin: '8px 0',
        accentColor: '#007AFF',
      }, 90);
      
      // Throttled input handler
      this.addEventListener(this.depthSlider, 'input', this.createThrottledHandler((e) => {
        const target = e.target as HTMLInputElement;
        const newZ = parseFloat(target.value);
        this.navigateToZ(newZ, { transitionDuration: 100 });
      }, 50)); // Throttle to 20fps for slider
      
      depthSection.appendChild(depthLabel);
      depthSection.appendChild(this.depthDisplay);
      depthSection.appendChild(this.depthSlider);
      this.uiContainer.appendChild(depthSection);
    }
  }
  
  private createLayerList(): void {
    if (!this.uiContainer) return;
    
    const layerSection = document.createElement('div');
    const styleBatcher = getStyleBatcher();
    styleBatcher.updateStyle(layerSection, 'marginBottom', '16px', 80);
    
    const layerLabel = document.createElement('div');
    layerLabel.textContent = 'Layers:';
    styleBatcher.updateStyle(layerLabel, 'marginBottom', '8px', 80);
    
    this.layerList = document.createElement('div');
    styleBatcher.updateMultipleStyles(this.layerList, {
      maxHeight: '150px',
      overflowY: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '4px',
      padding: '4px',
    }, 80);
    
    layerSection.appendChild(layerLabel);
    layerSection.appendChild(this.layerList);
    this.uiContainer.appendChild(layerSection);
    
    this.updateLayerList();
  }
  
  private createActionButtons(): void {
    if (!this.uiContainer) return;
    
    const buttonSection = document.createElement('div');
    const styleBatcher = getStyleBatcher();
    styleBatcher.updateMultipleStyles(buttonSection, {
      display: 'flex',
      gap: '8px',
      marginBottom: '16px',
      flexWrap: 'wrap',
    }, 70);
    
    const buttonConfigs = [
      { text: 'Surface', action: () => this.resetToSurface() },
      { text: 'Dive', action: () => this.diveDeeper(20) },
      { text: 'Emerge', action: () => this.emergeUp(20) },
    ];
    
    const buttonStyles = {
      background: '#007AFF',
      color: 'white',
      border: 'none',
      padding: '8px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'background-color 0.2s',
    };
    
    buttonConfigs.forEach(({ text, action }) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      
      styleBatcher.updateMultipleStyles(btn, buttonStyles, 70);
      
      // Optimized hover effects
      btn.addEventListener('mouseenter', () => {
        batchStyleUpdate(btn, 'backgroundColor', '#0056CC', 20);
      });
      
      btn.addEventListener('mouseleave', () => {
        batchStyleUpdate(btn, 'backgroundColor', '#007AFF', 20);
      });
      
      this.addEventListener(btn, 'click', action);
      buttonSection.appendChild(btn);
    });
    
    this.uiContainer.appendChild(buttonSection);
  }
  
  private createInstructions(): void {
    if (!this.uiContainer) return;
    
    const instructions = document.createElement('div');
    const styleBatcher = getStyleBatcher();
    styleBatcher.updateMultipleStyles(instructions, {
      fontSize: '11px',
      opacity: '0.7',
      lineHeight: '1.4',
    }, 60);
    
    instructions.innerHTML = `
      <strong>Controls:</strong><br>
      • <kbd>Q</kbd>/<kbd>E</kbd> - Dive/Emerge<br>
      • <kbd>Shift</kbd> + Q/E - Fast navigation<br>
      • Mouse wheel + <kbd>Alt</kbd> - Z navigation<br>
      • Drag slider for precise control
    `;
    
    this.uiContainer.appendChild(instructions);
  }
  
  /**
   * High-Performance Input Controls
   */
  private setupKeyboardControls(): void {
    this.addEventListener(document, 'keydown', (e) => {
      const event = e as KeyboardEvent;
      
      switch (event.code) {
        case 'KeyQ':
          if (!this.state.keyboardNavigation.forward) {
            this.state.keyboardNavigation.forward = true;
            this.state.keyboardNavigation.fastMode = event.shiftKey;
            this.startContinuousNavigation();
          }
          event.preventDefault();
          break;
          
        case 'KeyE':
          if (!this.state.keyboardNavigation.backward) {
            this.state.keyboardNavigation.backward = true;
            this.state.keyboardNavigation.fastMode = event.shiftKey;
            this.startContinuousNavigation();
          }
          event.preventDefault();
          break;
          
        case 'KeyR':
          if (event.ctrlKey || event.metaKey) {
            this.resetToSurface();
            event.preventDefault();
          }
          break;
      }
    });
    
    this.addEventListener(document, 'keyup', (e) => {
      const event = e as KeyboardEvent;
      
      switch (event.code) {
        case 'KeyQ':
          this.state.keyboardNavigation.forward = false;
          break;
          
        case 'KeyE':
          this.state.keyboardNavigation.backward = false;
          break;
      }
    });
  }
  
  private setupMouseControls(): void {
    // Throttled wheel handler
    const throttledWheelHandler = this.createThrottledHandler((e: WheelEvent) => {
      if (e.altKey) {
        const delta = e.deltaY * this.options.mouseSensitivity;
        const distance = Math.abs(delta);
        
        if (delta > 0) {
          this.diveDeeper(distance, 200);
        } else {
          this.emergeUp(distance, 200);
        }
        
        e.preventDefault();
      }
    }, 16); // 60fps throttling
    
    this.addEventListener(this.container, 'wheel', throttledWheelHandler, { passive: false });
    
    // Mouse drag for Z navigation
    this.addEventListener(this.container, 'mousedown', (e) => {
      const event = e as MouseEvent;
      
      if (event.ctrlKey || event.metaKey) {
        this.state.isDragging = true;
        this.state.lastPointerY = event.clientY;
        event.preventDefault();
      }
    });
    
    const throttledMoveHandler = this.createThrottledHandler((e: MouseEvent) => {
      if (this.state.isDragging) {
        const deltaY = e.clientY - this.state.lastPointerY;
        const distance = Math.abs(deltaY) * this.options.mouseSensitivity;
        
        if (deltaY > 0) {
          this.diveDeeper(distance, 50);
        } else {
          this.emergeUp(distance, 50);
        }
        
        this.state.lastPointerY = e.clientY;
        e.preventDefault();
      }
    }, 16);
    
    this.addEventListener(document, 'mousemove', throttledMoveHandler);
    
    this.addEventListener(document, 'mouseup', () => {
      this.state.isDragging = false;
    });
  }
  
  private setupTouchControls(): void {
    let lastTouchY = 0;
    let touchStartZ = 0;
    
    this.addEventListener(this.container, 'touchstart', (e) => {
      const event = e as TouchEvent;
      
      if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        lastTouchY = (touch1.clientY + touch2.clientY) / 2;
        touchStartZ = this.engine.getCurrentZ();
        event.preventDefault();
      }
    }, { passive: false });
    
    const throttledTouchHandler = this.createThrottledHandler((e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentY = (touch1.clientY + touch2.clientY) / 2;
        
        const deltaY = currentY - lastTouchY;
        const zDelta = deltaY * this.options.touchSensitivity;
        
        this.navigateToZ(touchStartZ + zDelta, { transitionDuration: 50 });
        e.preventDefault();
      }
    }, 16);
    
    this.addEventListener(this.container, 'touchmove', throttledTouchHandler, { passive: false });
  }
  
  /**
   * Optimized UI Updates
   */
  private updateUI(currentZ: number): void {
    const now = performance.now();
    
    // Throttle updates to avoid overwhelming the DOM scheduler
    if (now - this.lastUpdateTime < this.updateThrottle) {
      return;
    }
    
    this.lastUpdateTime = now;
    
    // High-priority updates (user-facing)
    if (this.depthDisplay) {
      batchTextUpdate(this.depthDisplay, `Z: ${currentZ.toFixed(1)}`, 10);
    }
    
    if (this.depthSlider && Math.abs(parseFloat(this.depthSlider.value) - currentZ) > 0.1) {
      batchAttributeUpdate(this.depthSlider, 'value', currentZ.toString(), 8);
    }
    
    // Lower priority update for layer list
    getDOMScheduler().schedule(() => this.updateLayerList(), 2, 'layer-list-update');
  }
  
  private updateLayerList(): void {
    if (!this.layerList) return;
    
    const layers = this.engine.getAllSpatialLayers();
    const currentZ = this.engine.getCurrentZ();
    
    // Early exit for empty layers
    if (layers.length === 0) {
      if (this.layerList.children.length === 0) {
        this.layerList.innerHTML = '<div style="opacity: 0.5; font-style: italic;">No layers</div>';
      }
      return;
    }
    
    // Efficient DOM updates - only update changed layers
    const existingElements = new Map<number, HTMLElement>();
    
    // Map existing elements
    Array.from(this.layerList.children).forEach((child) => {
      const element = child as HTMLElement;
      const zIndex = parseInt(element.dataset.zIndex || '0');
      existingElements.set(zIndex, element);
    });
    
    // Clear and rebuild (optimized approach)
    this.layerList.innerHTML = '';
    
    layers.forEach(layer => {
      const distance = Math.abs(layer.zIndex - currentZ);
      const isNear = distance < 20;
      
      // Reuse existing element if possible
      let layerElement = existingElements.get(layer.zIndex);
      
      if (!layerElement) {
        layerElement = document.createElement('div');
        layerElement.dataset.zIndex = layer.zIndex.toString();
      }
      
      // Batch style updates
      const styles = {
        padding: '4px 8px',
        margin: '2px 0',
        borderRadius: '3px',
        cursor: 'pointer',
        background: isNear ? 'rgba(0, 122, 255, 0.2)' : 'transparent',
        borderLeft: `3px solid ${isNear ? '#007AFF' : 'transparent'}`,
        transition: 'all 0.2s',
      };
      
      // Apply styles immediately for new elements
      Object.assign(layerElement.style, styles);
      
      layerElement.innerHTML = `
        <div style="font-weight: ${isNear ? 'bold' : 'normal'};">
          ${layer.name || `Layer ${layer.zIndex}`}
        </div>
        <div style="font-size: 11px; opacity: 0.7;">
          Z: ${layer.zIndex} (${distance.toFixed(1)} away)
        </div>
      `;
      
      // Optimized event handlers
      layerElement.onmouseenter = () => {
        batchStyleUpdate(layerElement!, 'backgroundColor', 'rgba(0, 122, 255, 0.3)', 15);
      };
      
      layerElement.onmouseleave = () => {
        batchStyleUpdate(layerElement!, 'backgroundColor', 
          isNear ? 'rgba(0, 122, 255, 0.2)' : 'transparent', 15);
      };
      
      layerElement.onclick = () => {
        this.navigateToZ(layer.zIndex, { transitionDuration: 800, easing: 'easeInOutCubic' });
      };
      
      this.layerList!.appendChild(layerElement);
    });
  }
  
  /**
   * Navigation Methods
   */
  private async navigateToZ(targetZ: number, options: Partial<ZNavigationOptions> = {}): Promise<void> {
    return this.engine.navigateToZ({
      targetZ,
      transitionDuration: 300,
      ...options,
    });
  }
  
  private async diveDeeper(distance: number = 10, duration: number = 500): Promise<void> {
    return this.engine.diveDeeper(distance, duration);
  }
  
  private async emergeUp(distance: number = 10, duration: number = 500): Promise<void> {
    return this.engine.emergeUp(distance, duration);
  }
  
  private async resetToSurface(duration: number = 1000): Promise<void> {
    return this.engine.resetToSurface(duration);
  }
  
  /**
   * Continuous Navigation
   */
  private continuousNavigationId: number | null = null;
  
  private startContinuousNavigation(): void {
    if (this.continuousNavigationId !== null) {
      return; // Already running
    }
    
    const navigate = () => {
      const { forward, backward, fastMode } = this.state.keyboardNavigation;
      
      if (!forward && !backward) {
        this.continuousNavigationId = null;
        return; // Stop navigation
      }
      
      const baseSpeed = this.options.keyboardSensitivity;
      const speed = fastMode ? baseSpeed * 3 : baseSpeed;
      
      if (forward) {
        this.diveDeeper(speed, 100);
      } else if (backward) {
        this.emergeUp(speed, 100);
      }
      
      this.continuousNavigationId = requestAnimationFrame(navigate);
    };
    
    this.continuousNavigationId = requestAnimationFrame(navigate);
  }
  
  /**
   * Performance Utilities
   */
  private createThrottledHandler<T extends Function>(handler: T, delay: number): T {
    let lastCall = 0;
    
    return ((...args: any[]) => {
      const now = performance.now();
      
      if (now - lastCall >= delay) {
        lastCall = now;
        return handler(...args);
      }
    }) as any;
  }
  
  private addEventListener(
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler });
  }
  
  /**
   * Public API
   */
  setEnabled(enabled: boolean): void {
    this.state.isActive = enabled;
    
    if (this.uiContainer) {
      batchStyleUpdate(this.uiContainer, 'display', enabled ? 'block' : 'none', 20);
    }
  }
  
  isEnabled(): boolean {
    return this.state.isActive;
  }
  
  updateOptions(options: Partial<ZControlsOptions>): void {
    Object.assign(this.options, options);
    
    if (options.showDepthIndicator !== undefined || options.showLayerList !== undefined) {
      this.destroyUI();
      if (this.options.enableUI) {
        this.createUI();
      }
    }
  }
  
  getPerformanceMetrics(): {
    lastUpdateTime: number;
    updateThrottle: number;
    eventListenerCount: number;
    domSchedulerStats: any;
  } {
    return {
      lastUpdateTime: this.lastUpdateTime,
      updateThrottle: this.updateThrottle,
      eventListenerCount: this.eventListeners.length,
      domSchedulerStats: getDOMScheduler().getStats(),
    };
  }
  
  /**
   * Cleanup
   */
  private destroyUI(): void {
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = null;
      this.depthSlider = null;
      this.depthDisplay = null;
      this.layerList = null;
      this.controlPanel = null;
    }
  }
  
  destroy(): void {
    // Stop continuous navigation
    if (this.continuousNavigationId !== null) {
      cancelAnimationFrame(this.continuousNavigationId);
      this.continuousNavigationId = null;
    }
    
    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    
    // Destroy UI
    this.destroyUI();
  }
}