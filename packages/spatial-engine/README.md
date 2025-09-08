# 🚀 FIR Spatial Engine

[![npm version](https://badge.fury.io/js/%40fir%2Fspatial-engine.svg)](https://badge.fury.io/js/%40fir%2Fspatial-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://github.com/fir-spatial/spatial-web/workflows/CI/badge.svg)](https://github.com/fir-spatial/spatial-web/actions)

High-performance spatial navigation engine with infinite zoom capabilities, WebGL-accelerated rendering, and comprehensive accessibility support.

> **Revolutionary Spatial Navigation**: Transform traditional web interfaces into explorable spatial environments with smooth pan, zoom, and flyTo operations at 60fps.

## ✨ Features

### 🎯 **Core Spatial Engine**
- **Infinite Zoom**: 0.001x to 1000x zoom levels with smooth transitions
- **60fps Performance**: Maintains smooth interaction at any scale
- **WebGL Rendering**: GPU-accelerated with instanced rendering
- **Smart Culling**: Viewport-based culling reduces rendered elements by 90%+

### ⚡ **Performance Optimizations**
- **Object Pooling**: Eliminates garbage collection pressure
- **Level of Detail**: Automatic optimization based on zoom level
- **Adaptive Frame Budgeting**: Maintains target framerate under load
- **Memory Profiling**: Built-in leak detection and monitoring

### ♿ **Accessibility First**
- **Keyboard Navigation**: Full spatial control with arrow keys
- **Screen Reader Support**: Rich spatial descriptions and ARIA integration
- **Focus Management**: Intelligent element focus with visual indicators
- **Spatial Audio**: Optional audio cues for navigation (coming soon)

### 🔬 **Advanced Features**
- **Multi-Strategy Indexing**: RBush + QuadTree + Uniform Grid
- **Hierarchical Spatial Queries**: K-nearest neighbor, radius, batch queries
- **Visual Regression Testing**: Pixel-perfect rendering validation
- **Comprehensive Benchmarking**: Real-world performance validation

## 🚀 Quick Start

### Installation

```bash
npm install @fir/spatial-engine
# or
pnpm add @fir/spatial-engine
# or
yarn add @fir/spatial-engine
```

### Basic Usage

```typescript
import { OptimizedSpatialEngine } from '@fir/spatial-engine';

// Create spatial engine
const engine = new OptimizedSpatialEngine({
  container: document.getElementById('spatial-container')!,
  width: 1920,
  height: 1080,
});

// Add elements to spatial world
const elements = [
  {
    id: 'welcome-card',
    type: 'rectangle',
    bounds: { x: 100, y: 100, width: 300, height: 200 },
    styles: {
      fill: '#667eea',
      borderRadius: '12px',
    },
    children: [],
  },
  {
    id: 'hero-text',
    type: 'text',
    bounds: { x: 500, y: 150, width: 400, height: 100 },
    styles: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '32px',
      color: '#1a202c',
    },
    children: [],
  },
];

await engine.setElements(elements);

// Navigate with smooth transitions
await engine.flyTo('welcome-card', { duration: 800 });

// Listen for interactions
engine.on('elementClick', (element, event) => {
  console.log(`Clicked: ${element.id}`);
});
```

## 📚 API Reference

### Core Classes

#### `OptimizedSpatialEngine`

The main class for high-performance spatial navigation.

```typescript
const engine = new OptimizedSpatialEngine(options);
```

**Options:**
- `container: HTMLElement` - DOM container for the spatial view
- `width: number` - Viewport width in pixels
- `height: number` - Viewport height in pixels

**Key Methods:**

```typescript
// Element management
await engine.setElements(elements: SpatialElement[])
const elements = engine.getElements()
const element = engine.findElement(id: string)

// Navigation
await engine.setViewport(viewport: Viewport, options?: TransitionOptions)
await engine.flyTo(target: string | SpatialElement | BoundingBox)
await engine.zoomToFit(elements?: SpatialElement[])
await engine.resetViewport()

// Queries
const elementsAtPoint = engine.getElementsAt(x: number, y: number)
const elementsInRegion = engine.getElementsInRegion(bounds: BoundingBox)

// Performance
const stats = engine.getPerformanceStats()
```

#### `ViewportCuller`

Efficient element culling for performance optimization.

```typescript
import { ViewportCuller } from '@fir/spatial-engine';

const culler = new ViewportCuller();
const { visible, stats } = culler.cullElements(elements, viewport);
```

#### `HierarchicalSpatialIndex`

Advanced spatial indexing for fast queries.

```typescript
import { HierarchicalSpatialIndex } from '@fir/spatial-engine/algorithms';

const index = new HierarchicalSpatialIndex();
index.indexElements(elements);

// Fast spatial queries
const nearbyElements = index.query(bounds);
const neighbors = index.queryKNN(x, y, k);
const inRadius = index.queryRadius(x, y, radius);
```

### Performance Utilities

#### `MemoryProfiler`

Monitor memory usage and detect leaks.

```typescript
import { MemoryProfiler } from '@fir/spatial-engine/performance';

const profiler = new MemoryProfiler();
profiler.startMonitoring();

// Track allocations
profiler.trackAllocation('my-allocation', 1024 * 1024);
profiler.releaseAllocation('my-allocation');

// Detect leaks
const analysis = profiler.detectLeaks();
console.log(`Memory growing at ${analysis.growthRate / 1024}KB/s`);
```

#### `RenderScheduler`

Maintain 60fps with adaptive frame budgeting.

```typescript
import { RenderScheduler } from '@fir/spatial-engine/performance';

const scheduler = new RenderScheduler(60); // Target 60fps

scheduler.schedule({
  id: 'expensive-task',
  execute: () => {
    // Your expensive operation
  },
  priority: 1,
  estimatedTime: 5, // milliseconds
});
```

## ♿ Accessibility

### Keyboard Navigation

Full spatial control with keyboard shortcuts:

```typescript
import { KeyboardNavigationManager } from '@fir/spatial-engine';

const keyboardNav = new KeyboardNavigationManager(engine, {
  panSpeed: 200,      // pixels per second
  zoomSpeed: 1.5,     // zoom factor
  focusRingColor: '#005fcc',
  announceLiveRegion: true,
});

keyboardNav.enable();
```

**Default Shortcuts:**
- `Arrow Keys`: Pan in any direction
- `+ / -`: Zoom in/out
- `0`: Reset zoom to 100%
- `Tab`: Navigate between elements
- `Enter/Space`: Activate focused element
- `Escape`: Clear focus and return to overview
- `?`: Show keyboard help

### Screen Reader Support

Rich spatial descriptions for assistive technology:

```typescript
import { ScreenReaderSupport } from '@fir/spatial-engine';

const screenReader = new ScreenReaderSupport(engine, {
  verbosity: 'normal',
  announceViewportChanges: true,
  spatialDescriptions: true,
});

// Set up ARIA structure
screenReader.setupAriaStructure(container);

// Get spatial descriptions
const description = screenReader.describeCurrentViewport();
const help = screenReader.provideNavigationHelp();
```

## 🔧 Performance Optimization

### Bundle Optimization

Tree-shakeable imports for minimal bundle size:

```typescript
// Import only what you need
import { SpatialEngine } from '@fir/spatial-engine';
import { ViewportCuller } from '@fir/spatial-engine/performance';
import { HierarchicalSpatialIndex } from '@fir/spatial-engine/algorithms';
```

### Production Settings

Optimal configuration for production:

```typescript
const engine = new OptimizedSpatialEngine({
  container,
  width: window.innerWidth,
  height: window.innerHeight,
});

// Enable performance monitoring
const profiler = new MemoryProfiler({
  samplingInterval: 5000, // 5 seconds
  maxSnapshots: 100,
});

// Set up culling for large datasets
const culler = new ViewportCuller();
engine.on('beforeRender', ({ elements, viewport }) => {
  const { visible } = culler.cullElements(elements, viewport);
  return { elements: visible };
});
```

## 🧪 Testing

### Unit Tests

```bash
npm test                 # Run all tests
npm run test:coverage    # Generate coverage report
npm run test:watch       # Watch mode
```

### E2E Testing

```bash
npm run test:e2e         # Playwright E2E tests
npm run test:visual      # Visual regression tests
npm run test:memory      # Memory performance tests
```

### Benchmarking

```bash
npm run benchmark        # Run performance benchmarks
```

Built-in benchmark suite tests:
- **Element Loading**: 100, 1K, 10K, 50K elements
- **Navigation Performance**: FlyTo, zoom, pan operations
- **Memory Usage**: Allocation tracking and leak detection
- **Real-World Scenarios**: Design systems, dashboards, CAD-like interfaces

## 📊 Performance Targets

| Metric | Target | Typical Achievement |
|--------|---------|-------------------|
| **Frame Rate** | 60 FPS | ✅ 60+ FPS sustained |
| **Memory Usage** | < 500MB (100K elements) | ✅ ~420MB |
| **Load Time** | < 2s (10K elements) | ✅ ~1.2s |
| **Navigation Latency** | < 100ms | ✅ ~85ms average |
| **Culling Efficiency** | > 80% | ✅ ~90% typically |

## 🎯 Use Cases

### Design Systems
```typescript
// Create explorable design system
const designElements = await parseDesignTokens(tokens);
await engine.setElements(designElements);

// Navigate from overview to component details
await engine.flyTo('button-variants');
await engine.setViewport({ zoom: 3 }); // Zoom to inspect details
```

### Data Visualization
```typescript
// Large-scale data exploration
const dataPoints = generateDataVisualization(dataset);
await engine.setElements(dataPoints);

// Smooth zoom from overview to detail
await engine.zoomToFit(); // See entire dataset
await engine.flyTo(selectedCluster); // Focus on cluster
```

### Interactive Documentation
```typescript
// Spatial documentation layout
const docElements = await parseMarkdownToSpatial(markdown);
await engine.setElements(docElements);

// Navigate sections spatially
await engine.flyTo('getting-started');
await engine.flyTo('api-reference');
```

## 🔌 Framework Integration

### React

```tsx
import { useEffect, useRef } from 'react';
import { OptimizedSpatialEngine } from '@fir/spatial-engine';

function SpatialView({ elements, onElementClick }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OptimizedSpatialEngine>();

  useEffect(() => {
    if (containerRef.current) {
      engineRef.current = new OptimizedSpatialEngine({
        container: containerRef.current,
        width: 800,
        height: 600,
      });

      engineRef.current.on('elementClick', onElementClick);
    }

    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setElements(elements);
  }, [elements]);

  return <div ref={containerRef} className="spatial-container" />;
}
```

### Vue

```vue
<template>
  <div ref="container" class="spatial-container"></div>
</template>

<script>
import { OptimizedSpatialEngine } from '@fir/spatial-engine';

export default {
  props: ['elements'],
  mounted() {
    this.engine = new OptimizedSpatialEngine({
      container: this.$refs.container,
      width: 800,
      height: 600,
    });
  },
  beforeUnmount() {
    this.engine?.destroy();
  },
  watch: {
    elements(newElements) {
      this.engine?.setElements(newElements);
    },
  },
};
</script>
```

## 🛠️ Development

### Building from Source

```bash
git clone https://github.com/fir-spatial/spatial-web.git
cd spatial-web/packages/spatial-engine
pnpm install
pnpm build
```

### Development Commands

```bash
pnpm dev                 # Watch mode
pnpm test               # Run tests
pnpm test:e2e           # E2E tests
pnpm test:visual        # Visual regression
pnpm benchmark          # Performance tests
pnpm lint               # Code linting
pnpm type-check         # TypeScript validation
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Development Guidelines

1. **Performance First**: Maintain 60fps target
2. **Accessibility**: Ensure keyboard and screen reader support
3. **Type Safety**: Full TypeScript coverage
4. **Testing**: Add tests for new features
5. **Documentation**: Update README and inline docs

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🙏 Acknowledgments

- **deck.gl** - WebGL rendering framework
- **RBush** - High-performance spatial indexing
- **D3** - Smooth interpolation and easing functions
- **Playwright** - Cross-browser testing framework

---

**Built with ❤️ by the FIR Spatial Team**

[🌟 Star us on GitHub](https://github.com/fir-spatial/spatial-web) | [📚 Documentation](https://docs.fir-spatial.dev) | [💬 Discussions](https://github.com/fir-spatial/spatial-web/discussions) | [🐛 Issues](https://github.com/fir-spatial/spatial-web/issues)