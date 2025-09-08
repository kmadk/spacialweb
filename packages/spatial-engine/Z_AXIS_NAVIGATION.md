# Z-Axis Navigation and Plugin System

This document describes the new 3D spatial navigation capabilities and extensible plugin system added to the Spatial Engine.

## Features Overview

### 🌊 Z-Axis Navigation
- **3D Spatial Movement** - Navigate through depth layers with smooth transitions
- **Layer Management** - Organize content across Z-levels with automatic culling
- **Advanced Easing** - Multiple easing functions including elastic and bounce effects
- **Viewport Integration** - Seamless integration with existing 2D spatial navigation

### 🔧 Plugin System  
- **Extensible Behaviors** - Add custom spatial behaviors via plugins
- **Built-in Optimizations** - Distance-based LOD, occlusion culling, adaptive quality
- **Event System** - React to viewport changes and element interactions
- **Hot-swappable** - Enable/disable plugins at runtime

## Quick Start

### Basic 3D Navigation

```typescript
import { SpatialEngine, ZNavigationControls } from '@spacialweb/spatial-engine';

// Create engine with 3D enabled
const engine = new SpatialEngine(container, {
  enable3D: true,
  maxDepth: 1000,
  minDepth: -1000,
});

// Add navigation controls
const controls = new ZNavigationControls(engine, {
  enableUI: true,
  showDepthIndicator: true,
  showLayerList: true,
});

// Navigate programmatically
await engine.navigateToZ({ 
  targetZ: 50, 
  duration: 1000, 
  easing: 'easeInOutElastic' 
});
```

### Layer Management

```typescript
// Create spatial layers
const backgroundLayer = {
  id: 'background',
  name: 'Background Elements',
  zIndex: -10,
  elements: backgroundElements,
  visible: true,
  cullDistance: 200,
};

const foregroundLayer = {
  id: 'foreground', 
  name: 'Interactive Elements',
  zIndex: 10,
  elements: interactiveElements,
  visible: true,
  cullDistance: 100,
};

// Add layers to engine
engine.addSpatialLayer(backgroundLayer);
engine.addSpatialLayer(foregroundLayer);

// Navigate to specific layer
await engine.navigateToZ({ targetZ: backgroundLayer.zIndex });
```

### Custom Plugin Development

```typescript
import type { SpatialPlugin, SpatialBehavior } from '@spacialweb/spatial-engine';

// Create a custom plugin
const analyticsPlugin: SpatialPlugin = {
  id: 'analytics-plugin',
  name: 'Analytics Tracker',
  version: '1.0.0',
  
  initialize(engine) {
    console.log('Analytics plugin initialized');
    this.engine = engine;
  },
  
  destroy() {
    console.log('Analytics plugin destroyed');
  },
  
  onViewportChange(viewport) {
    // Track viewport changes
    analytics.track('viewport_change', {
      x: viewport.x,
      y: viewport.y,
      z: viewport.z,
      zoom: viewport.zoom,
    });
  },
  
  onElementInteraction(element, type) {
    // Track element interactions
    analytics.track('element_interaction', {
      elementId: element.id,
      interactionType: type,
    });
  },
};

// Register and enable the plugin
const pluginManager = engine.getPluginManager();
await pluginManager.registerPlugin(analyticsPlugin);
await pluginManager.enablePlugin('analytics-plugin');
```

### Custom Behavior Development

```typescript
// Create a custom spatial behavior
const magneticBehavior: SpatialBehavior = {
  id: 'magnetic-elements',
  name: 'Magnetic Element Attraction',
  
  apply(elements, context) {
    const { viewport } = context;
    const viewerPos = { x: viewport.x, y: viewport.y, z: viewport.z || 0 };
    
    return elements.map(element => {
      const elementPos = {
        x: element.bounds.x,
        y: element.bounds.y,
        z: element.zPosition || 0,
      };
      
      // Calculate distance from viewer
      const distance = Math.sqrt(
        Math.pow(elementPos.x - viewerPos.x, 2) +
        Math.pow(elementPos.y - viewerPos.y, 2) +
        Math.pow(elementPos.z - viewerPos.z, 2)
      );
      
      // Apply magnetic effect for close elements
      if (distance < 50 && element.data?.magnetic) {
        const attraction = Math.max(0, (50 - distance) / 50);
        
        return {
          ...element,
          data: {
            ...element.data,
            styles: {
              ...element.data.styles,
              transform: `scale(${1 + attraction * 0.2})`,
              filter: `brightness(${1 + attraction * 0.5})`,
            },
          },
        };
      }
      
      return element;
    });
  },
  
  shouldApply(context) {
    // Only apply when in 3D mode and zoomed in
    return context.viewport.z !== undefined && context.viewport.zoom > 2;
  },
};

// Register the behavior
pluginManager.registerBehavior(magneticBehavior);
```

## Navigation Controls

### Keyboard Controls
- **Q/E** - Dive deeper / Emerge up
- **Shift + Q/E** - Fast navigation
- **Ctrl/Cmd + R** - Reset to surface

### Mouse Controls  
- **Alt + Mouse Wheel** - Z-axis navigation
- **Ctrl/Cmd + Drag** - Precise Z navigation

### Touch Controls
- **Two-finger vertical drag** - Z-axis navigation

### UI Controls
- **Depth Slider** - Precise Z-position control
- **Layer List** - Click to navigate to specific layers
- **Action Buttons** - Surface, Dive, Emerge shortcuts

## Performance Optimizations

### 3D Viewport Culling
The system includes advanced 3D culling that:
- **Frustum Culls** elements outside the 3D viewing volume
- **Distance Culls** elements too far from the viewer
- **Occlusion Culls** elements hidden behind others
- **LOD Assigns** appropriate level of detail based on distance

```typescript
import { ViewportCulling3D } from '@spacialweb/spatial-engine';

const culler = new ViewportCulling3D();
culler.setFrustumCullDistance(200);
culler.setLODDistanceThresholds([20, 50, 100, 200]);

const result = culler.cullElements(elements, viewport);
console.log(`Rendered ${result.visibleElements.length} of ${result.statistics.totalElements} elements`);
```

### Built-in Behaviors

The plugin system includes several built-in performance behaviors:

#### Distance-based LOD
```typescript
// Automatically applied - adjusts detail based on viewer distance
const lodBehavior = pluginManager.getBehavior('distance-lod');
```

#### Occlusion Culling
```typescript  
// Hides elements blocked by closer opaque elements
const occlusionBehavior = pluginManager.getBehavior('occlusion-culling');
```

#### Adaptive Quality
```typescript
// Reduces quality when frame rate drops
const adaptiveBehavior = pluginManager.getBehavior('adaptive-quality');
```

## Advanced Configuration

### Z-Navigation Options

```typescript
interface ZNavigationOptions {
  targetZ?: number;           // Absolute Z position
  relativeDelta?: number;     // Relative movement
  transitionDuration?: number; // Animation duration (ms)
  easing?: EasingFunction;    // Animation easing
  onProgress?: (progress: number, currentZ: number) => void;
  onComplete?: (finalZ: number) => void;
}

// Available easing functions:
type EasingFunction = 
  | 'linear'
  | 'easeInOutCubic'
  | 'easeOutQuart' 
  | 'easeOutExpo'
  | 'easeInOutBack'
  | 'easeInOutElastic'  // Great for depth transitions
  | 'easeOutBounce';    // Engaging for layer emergence
```

### Engine Options

```typescript
const engine = new SpatialEngine(container, {
  enable3D: true,           // Enable 3D navigation
  maxDepth: 1000,          // Maximum Z position
  minDepth: -1000,         // Minimum Z position  
  initialViewport: {
    x: 0, y: 0, z: 0,      // Starting position
    zoom: 1,
  },
});
```

### Control Options

```typescript
const controls = new ZNavigationControls(engine, {
  enableKeyboard: true,      // Keyboard navigation
  enableMouse: true,         // Mouse wheel navigation
  enableTouch: true,         // Touch navigation
  enableUI: true,            // Visual controls
  keyboardSensitivity: 10,   // Movement speed
  mouseSensitivity: 0.5,     // Mouse sensitivity
  showDepthIndicator: true,  // Z position display
  showLayerList: true,       // Layer navigation panel
});
```

## Integration Examples

### React Integration

```tsx
import React, { useEffect, useRef } from 'react';
import { SpatialEngine, ZNavigationControls } from '@spacialweb/spatial-engine';

const SpatialViewer3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SpatialEngine>();
  const controlsRef = useRef<ZNavigationControls>();
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const engine = new SpatialEngine(containerRef.current, {
      enable3D: true,
      maxDepth: 500,
      minDepth: -500,
    });
    
    const controls = new ZNavigationControls(engine, {
      enableUI: true,
      showDepthIndicator: true,
    });
    
    engineRef.current = engine;
    controlsRef.current = controls;
    
    return () => {
      controls.destroy();
      engine.destroy();
    };
  }, []);
  
  const handleDiveDeeper = () => {
    engineRef.current?.diveDeeper(20, 800);
  };
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <button 
        onClick={handleDiveDeeper}
        style={{ position: 'absolute', top: 10, left: 10 }}
      >
        Dive Deeper
      </button>
    </div>
  );
};
```

### Vue Integration

```vue
<template>
  <div class="spatial-viewer">
    <div ref="container" class="viewer-container" />
    <div class="controls">
      <button @click="resetToSurface">Surface</button>
      <button @click="diveDeeper">Dive</button>
      <button @click="emergeUp">Emerge</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { SpatialEngine, ZNavigationControls } from '@spacialweb/spatial-engine';

const container = ref<HTMLElement>();
let engine: SpatialEngine;
let controls: ZNavigationControls;

onMounted(() => {
  if (!container.value) return;
  
  engine = new SpatialEngine(container.value, {
    enable3D: true,
  });
  
  controls = new ZNavigationControls(engine);
});

onUnmounted(() => {
  controls?.destroy();
  engine?.destroy();
});

const resetToSurface = () => engine?.resetToSurface();
const diveDeeper = () => engine?.diveDeeper(15);
const emergeUp = () => engine?.emergeUp(15);
</script>
```

## Performance Tips

1. **Layer Organization** - Keep related elements in the same Z-layer for better culling
2. **Cull Distances** - Set appropriate cull distances to balance quality and performance  
3. **LOD Thresholds** - Tune LOD distance thresholds based on your content
4. **Plugin Order** - Behaviors are applied in registration order - put expensive ones last
5. **Frame Rate Monitoring** - Use adaptive quality behavior for variable performance

## Troubleshooting

### Common Issues

**3D navigation not working?**
- Ensure `enable3D: true` in engine options
- Check that elements have `zPosition` values
- Verify depth bounds are set correctly

**Poor performance with many elements?**
- Enable built-in culling behaviors
- Reduce cull distances for distant elements
- Use appropriate LOD thresholds

**Plugins not loading?**
- Check plugin structure matches `SpatialPlugin` interface
- Ensure all required methods are implemented  
- Check browser console for initialization errors

### Debug Mode

```typescript
// Enable debug information
engine.on('performanceUpdate', (metrics) => {
  console.log('Frame rate:', metrics.rendering.frameRate);
  console.log('Culled elements:', metrics.rendering.culledElements);
});

engine.getZNavigationManager().on('zNavigationStart', (data) => {
  console.log(`Navigating from Z=${data.fromZ} to Z=${data.toZ}`);
});
```

## API Reference

For complete API documentation, see the TypeScript definitions in the package. Key exports:

- `SpatialEngine` - Main 3D-enabled spatial engine
- `ZNavigationManager` - Core Z-axis navigation system
- `ZNavigationControls` - UI controls for 3D navigation  
- `PluginManager` - Plugin registration and lifecycle management
- `ViewportCulling3D` - Advanced 3D culling system
- Types: `ZNavigationOptions`, `SpatialLayer`, `SpatialPlugin`, `SpatialBehavior`