/**
 * Z-axis Navigation Controls
 * Provides UI controls and keyboard/mouse interactions for 3D spatial navigation
 */

import type { SpatialEngine } from '../spatial-engine.js';
import type { ZNavigationOptions } from '../types.js';

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

export class ZNavigationControls {
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

  constructor(engine: SpatialEngine, options: ZControlsOptions = {}) {
    this.engine = engine;
    this.container = options.container ?? engine.getViewport().constructor.arguments?.[0] ?? document.body;
    
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
      isActive: false,
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
    
    // Initial UI update
    this.updateUI(this.engine.getCurrentZ());
  }
  
  /**
   * UI Creation
   */
  private createUI(): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'z-navigation-controls';
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 1000;
      min-width: 200px;
      backdrop-filter: blur(10px);
    `;
    
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
    
    // Depth indicator
    if (this.options.showDepthIndicator) {
      const depthSection = document.createElement('div');
      depthSection.style.marginBottom = '16px';
      
      const depthLabel = document.createElement('div');
      depthLabel.textContent = 'Depth:';
      depthLabel.style.marginBottom = '8px';
      
      this.depthDisplay = document.createElement('div');
      this.depthDisplay.style.cssText = `
        font-family: monospace;
        font-size: 16px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 8px;
      `;
      
      // Depth slider
      this.depthSlider = document.createElement('input');
      this.depthSlider.type = 'range';
      this.depthSlider.min = '-1000';
      this.depthSlider.max = '1000';
      this.depthSlider.value = '0';
      this.depthSlider.step = '1';
      this.depthSlider.style.cssText = `
        width: 100%;
        margin: 8px 0;
        accent-color: #007AFF;
      `;
      
      this.addEventListener(this.depthSlider, 'input', (e) => {
        const target = e.target as HTMLInputElement;
        const newZ = parseFloat(target.value);
        this.navigateToZ(newZ, { duration: 100 });
      });
      
      depthSection.appendChild(depthLabel);
      depthSection.appendChild(this.depthDisplay);
      depthSection.appendChild(this.depthSlider);
      this.uiContainer.appendChild(depthSection);
    }
  }
  
  private createLayerList(): void {
    if (!this.uiContainer) return;
    
    const layerSection = document.createElement('div');
    layerSection.style.marginBottom = '16px';
    
    const layerLabel = document.createElement('div');
    layerLabel.textContent = 'Layers:';
    layerLabel.style.marginBottom = '8px';
    
    this.layerList = document.createElement('div');
    this.layerList.style.cssText = `
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 4px;
    `;
    
    layerSection.appendChild(layerLabel);
    layerSection.appendChild(this.layerList);
    this.uiContainer.appendChild(layerSection);
    
    this.updateLayerList();
  }
  
  private createActionButtons(): void {
    if (!this.uiContainer) return;
    
    const buttonSection = document.createElement('div');
    buttonSection.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    `;
    
    const buttonStyle = `
      background: #007AFF;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    `;
    
    const hoverStyle = 'background: #0056CC;';
    
    // Surface button
    const surfaceBtn = document.createElement('button');
    surfaceBtn.textContent = 'Surface';
    surfaceBtn.style.cssText = buttonStyle;
    surfaceBtn.addEventListener('mouseenter', () => {
      surfaceBtn.style.backgroundColor = '#0056CC';
    });
    surfaceBtn.addEventListener('mouseleave', () => {
      surfaceBtn.style.backgroundColor = '#007AFF';
    });
    this.addEventListener(surfaceBtn, 'click', () => {
      this.resetToSurface();
    });
    
    // Dive button
    const diveBtn = document.createElement('button');
    diveBtn.textContent = 'Dive';
    diveBtn.style.cssText = buttonStyle;
    diveBtn.addEventListener('mouseenter', () => {
      diveBtn.style.backgroundColor = '#0056CC';
    });
    diveBtn.addEventListener('mouseleave', () => {
      diveBtn.style.backgroundColor = '#007AFF';
    });
    this.addEventListener(diveBtn, 'click', () => {
      this.diveDeeper(20);
    });
    
    // Emerge button
    const emergeBtn = document.createElement('button');
    emergeBtn.textContent = 'Emerge';
    emergeBtn.style.cssText = buttonStyle;
    emergeBtn.addEventListener('mouseenter', () => {
      emergeBtn.style.backgroundColor = '#0056CC';
    });
    emergeBtn.addEventListener('mouseleave', () => {
      emergeBtn.style.backgroundColor = '#007AFF';
    });
    this.addEventListener(emergeBtn, 'click', () => {
      this.emergeUp(20);
    });
    
    buttonSection.appendChild(surfaceBtn);
    buttonSection.appendChild(diveBtn);
    buttonSection.appendChild(emergeBtn);
    this.uiContainer.appendChild(buttonSection);
  }
  
  private createInstructions(): void {
    if (!this.uiContainer) return;
    
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      font-size: 11px;
      opacity: 0.7;
      line-height: 1.4;
    `;
    
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
   * Input Controls Setup
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
    this.addEventListener(this.container, 'wheel', (e) => {
      const event = e as WheelEvent;
      
      if (event.altKey) {
        const delta = event.deltaY * this.options.mouseSensitivity;
        const distance = Math.abs(delta);
        
        if (delta > 0) {
          this.diveDeeper(distance, 200);
        } else {
          this.emergeUp(distance, 200);
        }
        
        event.preventDefault();
      }
    }, { passive: false });
    
    // Mouse drag for Z navigation
    this.addEventListener(this.container, 'mousedown', (e) => {
      const event = e as MouseEvent;
      
      if (event.ctrlKey || event.metaKey) {
        this.state.isDragging = true;
        this.state.lastPointerY = event.clientY;
        event.preventDefault();
      }
    });
    
    this.addEventListener(document, 'mousemove', (e) => {
      const event = e as MouseEvent;
      
      if (this.state.isDragging) {
        const deltaY = event.clientY - this.state.lastPointerY;
        const distance = Math.abs(deltaY) * this.options.mouseSensitivity;
        
        if (deltaY > 0) {
          this.diveDeeper(distance, 50);
        } else {
          this.emergeUp(distance, 50);
        }
        
        this.state.lastPointerY = event.clientY;
        event.preventDefault();
      }
    });
    
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
        // Two-finger touch for Z navigation
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        lastTouchY = (touch1.clientY + touch2.clientY) / 2;
        touchStartZ = this.engine.getCurrentZ();
        event.preventDefault();
      }
    }, { passive: false });
    
    this.addEventListener(this.container, 'touchmove', (e) => {
      const event = e as TouchEvent;
      
      if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const currentY = (touch1.clientY + touch2.clientY) / 2;
        
        const deltaY = currentY - lastTouchY;
        const zDelta = deltaY * this.options.touchSensitivity;
        
        this.navigateToZ(touchStartZ + zDelta, { duration: 50 });
        event.preventDefault();
      }
    }, { passive: false });
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
   * UI Updates
   */
  private updateUI(currentZ: number): void {
    if (this.depthDisplay) {
      this.depthDisplay.textContent = `Z: ${currentZ.toFixed(1)}`;
    }
    
    if (this.depthSlider && Math.abs(parseFloat(this.depthSlider.value) - currentZ) > 0.1) {
      this.depthSlider.value = currentZ.toString();
    }
    
    this.updateLayerList();
  }
  
  private updateLayerList(): void {
    if (!this.layerList) return;
    
    this.layerList.innerHTML = '';
    
    const layers = this.engine.getAllSpatialLayers();
    const currentZ = this.engine.getCurrentZ();
    
    if (layers.length === 0) {
      this.layerList.innerHTML = '<div style="opacity: 0.5; font-style: italic;">No layers</div>';
      return;
    }
    
    layers.forEach(layer => {
      const layerElement = document.createElement('div');
      const distance = Math.abs(layer.zIndex - currentZ);
      const isNear = distance < 20;
      
      layerElement.style.cssText = `
        padding: 4px 8px;
        margin: 2px 0;
        border-radius: 3px;
        cursor: pointer;
        background: ${isNear ? 'rgba(0, 122, 255, 0.2)' : 'transparent'};
        border-left: 3px solid ${isNear ? '#007AFF' : 'transparent'};
        transition: all 0.2s;
      `;
      
      layerElement.innerHTML = `
        <div style="font-weight: ${isNear ? 'bold' : 'normal'};">
          ${layer.name || `Layer ${layer.zIndex}`}
        </div>
        <div style="font-size: 11px; opacity: 0.7;">
          Z: ${layer.zIndex} (${distance.toFixed(1)} away)
        </div>
      `;
      
      layerElement.addEventListener('mouseenter', () => {
        layerElement.style.backgroundColor = 'rgba(0, 122, 255, 0.3)';
      });
      
      layerElement.addEventListener('mouseleave', () => {
        layerElement.style.backgroundColor = isNear ? 'rgba(0, 122, 255, 0.2)' : 'transparent';
      });
      
      this.addEventListener(layerElement, 'click', () => {
        this.navigateToZ(layer.zIndex, { duration: 800, easing: 'easeInOutCubic' });
      });
      
      this.layerList!.appendChild(layerElement);
    });
  }
  
  /**
   * Utility Methods
   */
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
      this.uiContainer.style.display = enabled ? 'block' : 'none';
    }
  }
  
  isEnabled(): boolean {
    return this.state.isActive;
  }
  
  updateOptions(options: Partial<ZControlsOptions>): void {
    Object.assign(this.options, options);
    
    // Recreate UI if options changed
    if (options.showDepthIndicator !== undefined || options.showLayerList !== undefined) {
      this.destroyUI();
      if (this.options.enableUI) {
        this.createUI();
      }
    }
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