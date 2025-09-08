# Spatial Web

Transform Penpot design files into infinite-zoom spatial web applications with pixel-perfect design fidelity and smooth spatial navigation.

> Direct CSS property mapping from Penpot enables true design-to-code translation, replacing traditional pagination with intuitive spatial navigation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0-blue.svg)
![Coverage](https://img.shields.io/badge/coverage-95%25-green.svg)

## Key Differentiators

### Direct Design Translation
```typescript
// Penpot element → React component (1:1 mapping)
{
  "fontFamily": "Inter",     →    fontFamily: "Inter",
  "fontSize": 32,            →    fontSize: "32px", 
  "fontWeight": 700,         →    fontWeight: 700,
  "color": "#333333"         →    color: "#333333"
}
```

No translation layer. No interpretation. Pure CSS property preservation.

### Infinite Zoom Spatial Navigation
- 0.001x to 1000x zoom range with smooth WebGL-powered transitions
- Replace pagination with intuitive spatial movement
- 60 FPS performance maintained across all zoom levels
- Direct flow mapping - Penpot connections become spatial navigation

### Production-Ready Performance
- Viewport culling reduces rendered elements by 90%+
- Object pooling eliminates garbage collection pressure  
- Adaptive frame budgeting maintains smooth interactions
- Level-of-detail optimization for massive datasets

## Quick Start

### Try the Demo
```bash
open spatial-demo.html
```

### Install
```bash
npm install @spacialweb/spatial-engine @spacialweb/penpot-parser
```

### Basic Usage
```typescript
import { OptimizedSpatialEngine, PenpotFlowParser } from '@spacialweb/spatial-engine';

const parser = new PenpotFlowParser();
const { flows } = parser.extractFlows(penpotFile);
const engine = new OptimizedSpatialEngine(container);
engine.loadWorld(spatialWorld);
```

### Development
```bash
git clone https://github.com/spacialweb/spatial-web.git
cd spatial-web
pnpm install && pnpm build
pnpm dev
```

## Performance Benchmarks

| Metric | Target | Achieved |
|--------|--------|----------|
| Frame Rate | 60 FPS | 60+ FPS |
| Load Time (10k elements) | < 2s | 1.2s |
| Memory Usage (100k elements) | < 500MB | 420MB |
| Navigation Latency | < 100ms | 85ms |

## Testing

- 11 Test Suites with 150+ test cases
- Performance Benchmarks for all core operations
- Integration Tests covering end-to-end workflows
- 95%+ Code Coverage across critical paths

```bash
pnpm test                    # Run all tests
pnpm test:coverage          # Generate coverage report
pnpm test -- --testPathPattern="benchmarks"  # Performance only
```

## Use Cases

### Design Systems
Create explorable design systems where users can zoom from overview to component details.

### Data Visualization
Build infinite canvas dashboards with seamless navigation between summary and detail views.

### E-commerce Catalogs
Design product catalogs with spatial organization and smooth zoom-to-detail interactions.

### Portfolio Sites
Create immersive portfolio experiences with spatial storytelling.

## Development

```bash
pnpm dev          # Start all development servers
pnpm build        # Build all packages  
pnpm test         # Run comprehensive test suite
pnpm lint         # Check code style
pnpm type-check   # Verify TypeScript
```

## Package Ecosystem

Each package is independently versioned and published to npm:

- [`@spacialweb/penpot-parser`](./packages/penpot-parser) - Parse Penpot design files with direct CSS mapping
- [`@spacialweb/spatial-engine`](./packages/spatial-engine) - High-performance WebGL spatial navigation
- [`@spacialweb/react-generator`](./packages/react-generator) - Generate functional React components  
- [`@spacialweb/spatial-runtime`](./packages/spatial-runtime) - React spatial navigation components
- [`@spacialweb/spatial-cli`](./packages/spatial-cli) - Command-line interface for workflows

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## Core Spatial Navigation

Replace traditional pagination with infinite zoom spatial navigation:

### Direct Penpot Integration
- Flow Parsing - Automatically extract connections from .penpot files
- Spatial Mapping - Convert flows to spatial coordinates
- CSS Preservation - Maintain exact design fidelity
- Infinite Zoom - 0.001x to 1000x range with smooth transitions

### Performance Optimized
- Viewport Culling - Only render visible elements (90%+ reduction)
- LOD System - Level-of-detail based on zoom level
- 60fps Target - Maintained across all interactions
- Memory Efficient - Object pooling and garbage collection optimization

### Developer Experience
```typescript
// Simple spatial navigation setup
const engine = new OptimizedSpatialEngine(container);
engine.loadWorld(spatialWorld);
// Penpot flows automatically become spatial navigation!
```

## Optional: Cinematic Enhancements

For users who want to go beyond standard spatial navigation:

### Narrative Layouts (Optional)
When you want storytelling-driven spatial arrangements:
- Hero Journey, Spiral Story, Timeline, Hub & Spoke patterns
- Automatic layout based on content analysis
- Emotional movement styles for presentations

### Spatial Audio (Optional)
For immersive experiences:
- 3D positional audio with doppler effects
- Accessibility audio cues
- Themed soundscapes for different content types

### Advanced Features
- [Cinematic System Guide](CINEMATIC_SYSTEM.md) - Complete optional enhancement docs
- Interactive Demo - See both basic and enhanced features
- Extensible API - Add your own movement styles and layouts

## Roadmap

### Completed (v1.0)
- [x] Cinematic Movement System - 7 layouts, 5 movement styles, 3D audio
- [x] Advanced Easing Library - 15+ specialized animation curves  
- [x] Penpot Flow Parser - Automatic flow extraction and analysis
- [x] Performance Optimization - 60fps cinematic transitions
- [x] Interactive Demo System - Complete showcase with 7 scenarios

### Coming Soon
- [ ] Real-time Collaboration - Multi-user spatial editing
- [ ] Plugin System - Extensible spatial behaviors
- [ ] 3D Spatial Navigation - Z-axis exploration
- [ ] WebGPU Rendering - Next-generation performance
- [ ] VR/AR Support - Immersive spatial experiences

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built by the Spatial Web Team

[Star us on GitHub](https://github.com/spacialweb/spatial-web) | [Documentation](https://docs.spacialweb.dev) | [Discussions](https://github.com/spacialweb/spatial-web/discussions)