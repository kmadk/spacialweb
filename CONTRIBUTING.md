# Contributing to FIR Spatial Web

Thank you for your interest in contributing to the FIR Spatial Web project! This guide will help you get started.

## 🎯 Ways to Contribute

- **Bug Reports** - Help us identify and fix issues
- **Feature Requests** - Suggest new cinematic movements or spatial features  
- **Code Contributions** - Fix bugs, add features, improve performance
- **Documentation** - Improve guides, examples, and API documentation
- **Community** - Help answer questions and support other users

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (we recommend using the version in `.nvmrc`)
- pnpm 8+ (specified in `package.json` packageManager field)
- Git

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/fir-spatial/spatial-web.git
cd spatial-web

# Install Node.js version (if using nvm)
nvm use

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Try the Demo
```bash
# Immediate demo (no build required)
./demo.sh

# Or open directly
open cinematic-demo.html
```

## 🎭 Areas for Contribution

### 🎬 Cinematic System (High Impact)
The cinematic movement system is our newest and most exciting feature area:

**Movement Styles** (`packages/spatial-engine/src/cinematics/cinematic-easing.ts`)
- Add new easing functions for different emotional tones
- Create multi-stage narrative easing patterns
- Improve performance of complex easing calculations

**Layout Patterns** (`packages/spatial-engine/src/cinematics/flow-choreographer.ts`)
- Design new narrative layout algorithms
- Optimize spatial positioning for different content types
- Add support for 3D spatial layouts

**Spatial Audio** (`packages/spatial-engine/src/cinematics/spatial-audio.ts`)
- Expand audio cue library with themed soundpacks
- Improve 3D positioning and doppler effects
- Add support for spatial voice narration

## 🧪 Testing

### Running Tests
```bash
# All tests
pnpm test

# Specific package
pnpm --filter @fir/spatial-engine test

# E2E tests
pnpm test:e2e

# Performance tests
pnpm test:performance
```

### Cinematic System Testing
When contributing to the cinematic system:

```bash
# Test cinematic features specifically
pnpm --filter @fir/spatial-engine test --grep "cinematic"

# Run demo for manual testing
./demo.sh

# Performance test cinematics
pnpm test:performance --grep "cinematic"
```

## 📋 Pull Request Process

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Follow the code style guidelines
- Add tests for new functionality
- Update documentation as needed
- Test your changes thoroughly

### 3. Commit Changes
We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Examples:
git commit -m "feat(cinematics): add new spiral layout pattern"
git commit -m "fix(spatial-engine): resolve memory leak in viewport culling"
git commit -m "docs(readme): improve cinematic demo instructions"
```

### 4. Test Before Submitting
```bash
# Run full test suite
pnpm test

# Check builds
pnpm build

# Verify demos work
./demo.sh
```

## 🎭 Cinematic System Contributions

The cinematic system is our most innovative feature. Here are specific ways to contribute:

### New Movement Styles
```typescript
// Add to CinematicEasingLibrary
'your-style-name': {
  name: 'Your Style Name',
  description: 'Description of the movement',
  emotionalTone: 'dramatic', // or 'playful', 'calm', etc.
  function: (t: number) => {
    // Your easing logic here
    return easedValue;
  }
}
```

### New Layout Patterns
```typescript
// Add to FlowChoreographer
private generateYourLayout(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
  // Your positioning algorithm
  return layout;
}
```

## 🐛 Bug Reports

When reporting bugs:

1. **Check existing issues** first
2. **Use the bug report template**
3. **Include reproduction steps**
4. **Provide system information**
5. **Add screenshots/videos** if helpful

For cinematic system bugs, please include:
- Which demo scenario exhibits the issue
- Browser and GPU information
- Performance metrics if relevant
- Audio setup if audio-related

## 💡 Feature Requests

We love new ideas! When suggesting features:

1. **Describe the problem** you're trying to solve
2. **Explain your proposed solution**
3. **Consider the impact** on performance and usability
4. **Provide examples** or mockups if helpful

## ❓ Questions?

- **General questions**: Use GitHub Discussions
- **Bug reports**: Create a GitHub Issue  
- **Security concerns**: See SECURITY.md
- **Feature ideas**: Start with GitHub Discussions

---

**Ready to contribute to the future of spatial navigation and cinematic storytelling?** 

Start with the demo (`./demo.sh`), explore the code, and don't hesitate to ask questions! 🚀🎬