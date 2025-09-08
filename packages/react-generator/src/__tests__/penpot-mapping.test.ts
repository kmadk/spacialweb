import { describe, it, expect } from 'vitest';
import { ReactGenerator } from '../react-generator.js';
import type { PenpotFile, PenpotElement } from '@fir/penpot-parser';

describe('Penpot Direct Code Mapping', () => {
  const generator = new ReactGenerator();

  it('should map Penpot CSS properties directly to React styles', () => {
    // Penpot uses actual CSS properties, not abstract design tokens
    const penpotElement: PenpotElement = {
      id: 'button-1',
      name: 'Primary Button',
      type: 'rectangle',
      bounds: { x: 100, y: 200, width: 120, height: 40 },
      styles: {
        // These are actual CSS properties from Penpot
        fill: { type: 'solid', color: '#007bff', opacity: 0.9 },
        stroke: { color: '#0056b3', width: 1, style: 'solid' },
        layout: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: { top: 8, right: 16, bottom: 8, left: 16 },
        },
        effects: [
          {
            type: 'shadow',
            blur: 4,
            color: '#00000026',
            offset: { x: 0, y: 2 },
          }
        ]
      },
    };

    const mockFile: PenpotFile = {
      version: '1.0.0',
      pages: [{
        id: 'page-1',
        name: 'Test',
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        elements: [penpotElement],
      }],
      components: [],
      assets: [],
      tokens: { colors: {}, typography: {}, spacing: {}, shadows: {} },
      metadata: {
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        totalElements: 1,
        totalPages: 1,
        fileSize: 1024,
      },
    };

    const project = generator.generateProject(mockFile, {
      projectName: 'test-app',
      framework: 'react',
      typescript: true,
      spatialNavigation: false,
    });

    const pageComponent = project.files.find(f => f.path === 'src/pages/Test.tsx');
    expect(pageComponent).toBeDefined();

    // Should directly map CSS properties, not abstract them
    expect(pageComponent!.content).toContain('backgroundColor');
    expect(pageComponent!.content).toContain('#007bff'); // Exact color from Penpot
    expect(pageComponent!.content).toContain('border'); // From stroke
    expect(pageComponent!.content).toContain('#0056b3'); // Exact stroke color
    expect(pageComponent!.content).toContain('1px solid'); // Exact stroke style
  });

  it('should preserve Penpot layout properties as CSS-in-JS', () => {
    const flexElement: PenpotElement = {
      id: 'flex-container',
      name: 'Flex Container',
      type: 'group',
      bounds: { x: 0, y: 0, width: 400, height: 200 },
      styles: {
        layout: {
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        },
      },
      children: [
        {
          id: 'flex-item-1',
          name: 'Item 1',
          type: 'text',
          bounds: { x: 0, y: 0, width: 100, height: 30 },
          styles: {
            typography: {
              fontFamily: 'Inter',
              fontSize: 16,
              fontWeight: 500,
              color: '#333',
              textAlign: 'left',
            }
          },
        },
      ],
    };

    const mockFile: PenpotFile = {
      version: '1.0.0',
      pages: [{
        id: 'page-1',
        name: 'Layout Test',
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        elements: [flexElement],
      }],
      components: [],
      assets: [],
      tokens: { colors: {}, typography: {}, spacing: {}, shadows: {} },
      metadata: {
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        totalElements: 1,
        totalPages: 1,
        fileSize: 1024,
      },
    };

    const project = generator.generateProject(mockFile, {
      projectName: 'layout-app',
      framework: 'react',
      typescript: true,
      spatialNavigation: false,
    });

    const pageComponent = project.files.find(f => f.path === 'src/pages/LayoutTest.tsx');
    
    // Should preserve exact Flexbox properties from Penpot
    expect(pageComponent!.content).toContain('display');
    expect(pageComponent!.content).toContain('flex');
    expect(pageComponent!.content).toContain('flexDirection');
    expect(pageComponent!.content).toContain('justifyContent');
    expect(pageComponent!.content).toContain('space-between');
    expect(pageComponent!.content).toContain('alignItems');
    expect(pageComponent!.content).toContain('center');
  });

  it('should map Penpot typography directly to CSS font properties', () => {
    const textElement: PenpotElement = {
      id: 'heading-1',
      name: 'Main Heading',
      type: 'text',
      bounds: { x: 50, y: 100, width: 300, height: 48 },
      styles: {
        typography: {
          // These are actual CSS font properties from Penpot
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: -0.02,
          color: '#1a1a1a',
          textAlign: 'center',
          textDecoration: 'none',
        },
      },
      data: { text: 'Welcome to Our Platform' },
    };

    const mockFile: PenpotFile = {
      version: '1.0.0',
      pages: [{
        id: 'page-1',
        name: 'Typography Test',
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        elements: [textElement],
      }],
      components: [],
      assets: [],
      tokens: { colors: {}, typography: {}, spacing: {}, shadows: {} },
      metadata: {
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        totalElements: 1,
        totalPages: 1,
        fileSize: 1024,
      },
    };

    const project = generator.generateProject(mockFile, {
      projectName: 'typography-app',
      framework: 'react',
      typescript: true,
      spatialNavigation: false,
    });

    const pageComponent = project.files.find(f => f.path === 'src/pages/TypographyTest.tsx');
    
    // Should use exact font properties from Penpot
    expect(pageComponent!.content).toContain('fontFamily');
    expect(pageComponent!.content).toContain('Inter, system-ui, sans-serif');
    expect(pageComponent!.content).toContain('fontSize');
    expect(pageComponent!.content).toContain('32px'); // Converted to CSS unit
    expect(pageComponent!.content).toContain('fontWeight');
    expect(pageComponent!.content).toContain('700');
    expect(pageComponent!.content).toContain('textAlign');
    expect(pageComponent!.content).toContain('center');
    expect(pageComponent!.content).toContain('color');
    expect(pageComponent!.content).toContain('#1a1a1a');
  });

  it('should preserve SVG-based shapes as they are in Penpot', () => {
    // Penpot internally uses SVG, so we should maintain that fidelity
    const svgElement: PenpotElement = {
      id: 'custom-shape',
      name: 'Custom Icon',
      type: 'image', // SVG in Penpot
      bounds: { x: 200, y: 150, width: 24, height: 24 },
      styles: {
        fill: { type: 'solid', color: '#4f46e5' },
      },
      data: {
        src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMSA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDMgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNEY0NkU1Ii8+Cjwvc3ZnPgo='
      }
    };

    const mockFile: PenpotFile = {
      version: '1.0.0',
      pages: [{
        id: 'page-1',
        name: 'SVG Test',
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        elements: [svgElement],
      }],
      components: [],
      assets: [],
      tokens: { colors: {}, typography: {}, spacing: {}, shadows: {} },
      metadata: {
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        totalElements: 1,
        totalPages: 1,
        fileSize: 1024,
      },
    };

    const project = generator.generateProject(mockFile, {
      projectName: 'svg-app',
      framework: 'react',
      typescript: true,
      spatialNavigation: false,
    });

    const pageComponent = project.files.find(f => f.path === 'src/pages/SvgTest.tsx');
    
    // Should preserve SVG data URL from Penpot
    expect(pageComponent!.content).toContain('<img');
    expect(pageComponent!.content).toContain('data:image/svg+xml');
    expect(pageComponent!.content).toContain('alt="Custom Icon"');
  });

  it('should demonstrate the advantage over Figma-style abstract mapping', () => {
    // This test shows what makes Penpot special:
    // Instead of mapping abstract "design tokens" to code,
    // we map actual CSS properties 1:1

    const penpotButton: PenpotElement = {
      id: 'web-native-button',
      name: 'Web Native Button',
      type: 'rectangle',
      bounds: { x: 0, y: 0, width: 140, height: 44 },
      styles: {
        // These are ACTUAL CSS properties, not design abstractions
        fill: { type: 'solid', color: '#059669', opacity: 1 },
        stroke: { color: '#047857', width: 1, style: 'solid' },
        layout: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
        effects: [
          {
            type: 'shadow',
            blur: 3,
            color: '#0596691a',
            offset: { x: 0, y: 1 },
          }
        ]
      },
      interactions: [
        {
          trigger: 'click',
          action: { type: 'navigate', target: 'success-page' }
        }
      ]
    };

    const mockFile: PenpotFile = {
      version: '1.0.0',
      pages: [{
        id: 'page-1',
        name: 'Web Native',
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        elements: [penpotButton],
      }],
      components: [],
      assets: [],
      tokens: { colors: {}, typography: {}, spacing: {}, shadows: {} },
      metadata: {
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        totalElements: 1,
        totalPages: 1,
        fileSize: 1024,
      },
    };

    const project = generator.generateProject(mockFile, {
      projectName: 'web-native-app',
      framework: 'react',
      typescript: true,
      spatialNavigation: true,
    });

    const pageComponent = project.files.find(f => f.path === 'src/pages/WebNative.tsx');
    
    // The generated code should be EXACTLY what a developer would write
    // No "translation" or "interpretation" needed
    expect(pageComponent!.content).toContain('backgroundColor: "#059669"'); // Exact CSS
    expect(pageComponent!.content).toContain('border: "1px solid #047857"'); // Exact CSS  
    expect(pageComponent!.content).toContain('display: "flex"'); // Exact CSS
    expect(pageComponent!.content).toContain('justifyContent: "center"'); // Exact CSS
    expect(pageComponent!.content).toContain('alignItems: "center"'); // Exact CSS
    
    // Interactions should be preserved as functional code
    expect(pageComponent!.content).toContain('onClick');
    expect(pageComponent!.content).toContain('onNavigate');
    expect(pageComponent!.content).toContain('success-page');

    // This is the key difference from Figma:
    // NO abstraction layer, NO "design system translation"
    // Direct CSS-to-React mapping because Penpot IS web-native
  });

  it('should handle Penpot component instances with parameter overrides', () => {
    // Penpot components can have parameters that get overridden in instances
    // This is similar to CSS custom properties / CSS variables
    
    const buttonComponent: PenpotElement = {
      id: 'button-master',
      name: 'Button Master',
      type: 'rectangle',
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      styles: {
        fill: { type: 'solid', color: 'var(--button-bg)', opacity: 1 },
        stroke: { color: 'var(--button-border)', width: 1, style: 'solid' },
      },
    };

    const buttonInstance: PenpotElement = {
      id: 'button-instance-1',
      name: 'Primary Button Instance',
      type: 'instance',
      bounds: { x: 100, y: 200, width: 120, height: 40 },
      styles: {
        // Instance overrides - these should replace the variables
        fill: { type: 'solid', color: '#3b82f6', opacity: 1 },
        stroke: { color: '#2563eb', width: 1, style: 'solid' },
      },
      data: {
        componentId: 'button-master',
        overrides: {
          '--button-bg': '#3b82f6',
          '--button-border': '#2563eb',
        }
      }
    };

    const mockFile: PenpotFile = {
      version: '1.0.0',
      pages: [{
        id: 'page-1',
        name: 'Component Test',
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        elements: [buttonInstance],
      }],
      components: [{
        id: 'button-component',
        name: 'Button',
        bounds: { x: 0, y: 0, width: 120, height: 40 },
        elements: [buttonComponent],
      }],
      assets: [],
      tokens: { colors: {}, typography: {}, spacing: {}, shadows: {} },
      metadata: {
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        totalElements: 1,
        totalPages: 1,
        fileSize: 1024,
      },
    };

    const project = generator.generateProject(mockFile, {
      projectName: 'component-app',
      framework: 'react',
      typescript: true,
      spatialNavigation: false,
    });

    // Should generate the component with prop-based styling
    const buttonComponent_file = project.files.find(f => f.path === 'src/components/Button.tsx');
    expect(buttonComponent_file).toBeDefined();

    // Instance should use the resolved values
    const pageComponent = project.files.find(f => f.path === 'src/pages/ComponentTest.tsx');
    expect(pageComponent!.content).toContain('#3b82f6'); // Resolved color
    expect(pageComponent!.content).toContain('#2563eb'); // Resolved border color
  });
});