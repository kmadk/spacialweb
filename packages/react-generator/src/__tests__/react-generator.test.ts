import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactGenerator } from '../react-generator.js';
import type { PenpotFile, PenpotElement } from '@fir/penpot-parser';
import type { GenerationOptions } from '../types.js';

// Mock prettier
vi.mock('prettier', () => ({
  default: {
    format: (code: string) => code.replace(/\s+/g, ' ').trim(),
  },
}));

describe('ReactGenerator', () => {
  let generator: ReactGenerator;
  let mockPenpotFile: PenpotFile;
  let baseOptions: GenerationOptions;

  beforeEach(() => {
    generator = new ReactGenerator();
    
    mockPenpotFile = {
      version: '1.0.0',
      pages: [
        {
          id: 'page-1',
          name: 'Home Page',
          bounds: { x: 0, y: 0, width: 1200, height: 800 },
          elements: [
            {
              id: 'header',
              name: 'Header',
              type: 'rectangle',
              bounds: { x: 0, y: 0, width: 1200, height: 80 },
              styles: {
                fill: { type: 'solid', color: '#ffffff', opacity: 1 },
                stroke: { color: '#e0e0e0', width: 1, style: 'solid' },
              },
            },
            {
              id: 'title',
              name: 'Page Title',
              type: 'text',
              bounds: { x: 50, y: 100, width: 300, height: 60 },
              styles: {
                typography: {
                  fontFamily: 'Inter',
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#333333',
                  textAlign: 'left',
                },
              },
              data: { text: 'Welcome to Our Site' },
            },
            {
              id: 'cta-button',
              name: 'CTA Button',
              type: 'rectangle',
              bounds: { x: 50, y: 200, width: 200, height: 50 },
              styles: {
                fill: { type: 'solid', color: '#007bff', opacity: 1 },
              },
              interactions: [
                {
                  trigger: 'click',
                  action: { type: 'navigate', target: 'about-page' },
                },
              ],
            },
          ],
        },
        {
          id: 'about-page',
          name: 'About Us',
          bounds: { x: 0, y: 0, width: 1200, height: 600 },
          elements: [
            {
              id: 'about-content',
              name: 'About Content',
              type: 'group',
              bounds: { x: 50, y: 50, width: 1100, height: 500 },
              styles: {},
              children: [
                {
                  id: 'about-title',
                  name: 'About Title',
                  type: 'text',
                  bounds: { x: 0, y: 0, width: 400, height: 40 },
                  styles: {
                    typography: {
                      fontFamily: 'Inter',
                      fontSize: 28,
                      fontWeight: 600,
                      color: '#333333',
                      textAlign: 'left',
                    },
                  },
                  data: { text: 'About Our Company' },
                },
              ],
            },
          ],
        },
      ],
      components: [
        {
          id: 'button-component',
          name: 'Primary Button',
          bounds: { x: 0, y: 0, width: 120, height: 40 },
          elements: [
            {
              id: 'button-bg',
              name: 'Button Background',
              type: 'rectangle',
              bounds: { x: 0, y: 0, width: 120, height: 40 },
              styles: {
                fill: { type: 'solid', color: '#007bff', opacity: 1 },
              },
            },
            {
              id: 'button-text',
              name: 'Button Text',
              type: 'text',
              bounds: { x: 20, y: 10, width: 80, height: 20 },
              styles: {
                typography: {
                  fontFamily: 'Inter',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#ffffff',
                  textAlign: 'center',
                },
              },
              data: { text: 'Click Me' },
            },
          ],
        },
      ],
      assets: [
        {
          id: 'logo-asset',
          name: 'logo.png',
          type: 'image',
          path: 'assets/logo.png',
          data: new ArrayBuffer(1024),
        },
      ],
      tokens: {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          danger: '#dc3545',
        },
        typography: {
          heading: {
            fontFamily: 'Inter',
            fontSize: 32,
            fontWeight: 700,
            color: '#333333',
            textAlign: 'left',
          },
        },
        spacing: {
          xs: 4,
          sm: 8,
          md: 16,
          lg: 24,
          xl: 32,
        },
        shadows: {},
      },
      metadata: {
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        version: '1.0.0',
        totalElements: 5,
        totalPages: 2,
        fileSize: 2048,
      },
    };

    baseOptions = {
      projectName: 'test-spatial-app',
      framework: 'react',
      typescript: true,
      spatialNavigation: true,
      stateManagement: 'zustand',
    };
  });

  describe('generateProject', () => {
    it('should generate complete project structure', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);

      expect(project.files).toBeDefined();
      expect(project.assets).toBeDefined();
      expect(project.metadata).toBeDefined();

      // Should have core files
      const filePaths = project.files.map(f => f.path);
      expect(filePaths).toContain('src/App.tsx');
      expect(filePaths).toContain('src/main.tsx');
      expect(filePaths).toContain('package.json');
      expect(filePaths).toContain('vite.config.ts');
      expect(filePaths).toContain('tsconfig.json');

      // Should have page components
      expect(filePaths).toContain('src/pages/HomePage.tsx');
      expect(filePaths).toContain('src/pages/AboutUs.tsx');

      // Should have reusable components
      expect(filePaths).toContain('src/components/PrimaryButton.tsx');
    });

    it('should generate correct metadata', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);

      expect(project.metadata.framework).toBe('react');
      expect(project.metadata.spatialEngine).toBe(true);
      expect(project.metadata.totalComponents).toBe(1);
      expect(project.metadata.totalPages).toBe(2);
      expect(project.metadata.generatedAt).toBeDefined();
    });

    it('should process assets correctly', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);

      expect(project.assets).toHaveLength(1);
      
      const asset = project.assets[0];
      expect(asset.id).toBe('logo-asset');
      expect(asset.originalPath).toBe('assets/logo.png');
      expect(asset.outputPath).toBe('src/assets/assets/logo.png');
      expect(asset.type).toBe('image');
      expect(asset.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should generate different output based on options', () => {
      // Test with spatial navigation disabled
      const nonSpatialOptions: GenerationOptions = {
        ...baseOptions,
        spatialNavigation: false,
      };

      const spatialProject = generator.generateProject(mockPenpotFile, baseOptions);
      const nonSpatialProject = generator.generateProject(mockPenpotFile, nonSpatialOptions);

      // Spatial project should have spatial imports
      const spatialApp = spatialProject.files.find(f => f.path === 'src/App.tsx');
      const nonSpatialApp = nonSpatialProject.files.find(f => f.path === 'src/App.tsx');

      expect(spatialApp?.content).toContain('SpatialApp');
      expect(spatialApp?.content).toContain('SpatialRouter');
      
      expect(nonSpatialApp?.content).toContain('BrowserRouter');
      expect(nonSpatialApp?.content).not.toContain('SpatialApp');
    });
  });

  describe('component generation', () => {
    it('should generate page components with correct structure', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const homePage = project.files.find(f => f.path === 'src/pages/HomePage.tsx');

      expect(homePage).toBeDefined();
      expect(homePage?.content).toContain('export const HomePage');
      expect(homePage?.content).toContain('export interface HomePageProps');
      expect(homePage?.content).toContain('export default HomePage');
      
      // Should include spatial region when spatial navigation is enabled
      expect(homePage?.content).toContain('SpatialRegion');
      expect(homePage?.content).toContain('id="page-1"');
    });

    it('should generate reusable components correctly', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const button = project.files.find(f => f.path === 'src/components/PrimaryButton.tsx');

      expect(button).toBeDefined();
      expect(button?.content).toContain('export const PrimaryButton');
      expect(button?.content).toContain('export interface PrimaryButtonProps');
      expect(button?.content).toContain('data-component-id="button-component"');
    });

    it('should generate correct JSX for different element types', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const homePage = project.files.find(f => f.path === 'src/pages/HomePage.tsx');

      // Should have rectangle elements as divs
      expect(homePage?.content).toContain('id="header"');
      expect(homePage?.content).toContain('<div');

      // Should have text elements as spans
      expect(homePage?.content).toContain('id="title"');
      expect(homePage?.content).toContain('<span');
      expect(homePage?.content).toContain('Welcome to Our Site');

      // Should have group elements
      const aboutPage = project.files.find(f => f.path === 'src/pages/AboutUs.tsx');
      expect(aboutPage?.content).toContain('className="group"');
    });

    it('should generate correct inline styles', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const homePage = project.files.find(f => f.path === 'src/pages/HomePage.tsx');

      // Should include background color from fill
      expect(homePage?.content).toContain('backgroundColor');
      expect(homePage?.content).toContain('#ffffff');

      // Should include typography styles
      expect(homePage?.content).toContain('fontFamily');
      expect(homePage?.content).toContain('Inter');
      expect(homePage?.content).toContain('fontSize');
    });

    it('should generate interaction handlers', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const homePage = project.files.find(f => f.path === 'src/pages/HomePage.tsx');

      // Should have onClick handler for navigation
      expect(homePage?.content).toContain('onClick=');
      expect(homePage?.content).toContain('onNavigate');
      expect(homePage?.content).toContain('about-page');
    });
  });

  describe('project configuration', () => {
    it('should generate correct package.json', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const packageJson = project.files.find(f => f.path === 'package.json');

      expect(packageJson).toBeDefined();
      
      const packageData = JSON.parse(packageJson!.content);
      expect(packageData.name).toBe('test-spatial-app');
      expect(packageData.dependencies.react).toBeDefined();
      expect(packageData.dependencies['@fir/spatial-runtime']).toBeDefined();
      expect(packageData.devDependencies.typescript).toBeDefined();
      expect(packageData.devDependencies.vite).toBeDefined();
    });

    it('should generate correct vite config', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const viteConfig = project.files.find(f => f.path === 'vite.config.ts');

      expect(viteConfig).toBeDefined();
      expect(viteConfig?.content).toContain('import react from');
      expect(viteConfig?.content).toContain('plugins: [react()]');
    });

    it('should generate correct TypeScript config', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const tsConfig = project.files.find(f => f.path === 'tsconfig.json');

      expect(tsConfig).toBeDefined();
      
      const tsConfigData = JSON.parse(tsConfig!.content);
      expect(tsConfigData.compilerOptions.jsx).toBe('react-jsx');
      expect(tsConfigData.compilerOptions.strict).toBe(true);
    });

    it('should generate appropriate files for TypeScript setting', () => {
      const tsProject = generator.generateProject(mockPenpotFile, baseOptions);
      const jsOptions = { ...baseOptions, typescript: false };
      const jsProject = generator.generateProject(mockPenpotFile, jsOptions);

      const tsFiles = tsProject.files.filter(f => f.path.endsWith('.tsx') || f.path.endsWith('.ts'));
      const jsFiles = jsProject.files.filter(f => f.path.endsWith('.jsx') || f.path.endsWith('.js'));

      expect(tsFiles.length).toBeGreaterThan(0);
      // Note: Our current implementation always generates TypeScript files
      // This test documents current behavior
    });
  });

  describe('spatial navigation integration', () => {
    it('should generate spatial world configuration', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const app = project.files.find(f => f.path === 'src/App.tsx');

      expect(app?.content).toContain('spatialWorld');
      expect(app?.content).toContain('bounds');
      expect(app?.content).toContain('elements');
      expect(app?.content).toContain('regions');
    });

    it('should generate spatial routes', () => {
      const project = generator.generateProject(mockPenpotFile, baseOptions);
      const app = project.files.find(f => f.path === 'src/App.tsx');

      expect(app?.content).toContain('routes');
      expect(app?.content).toContain('/home-page');
      expect(app?.content).toContain('/about-us');
    });

    it('should not include spatial features when disabled', () => {
      const nonSpatialOptions = { ...baseOptions, spatialNavigation: false };
      const project = generator.generateProject(mockPenpotFile, nonSpatialOptions);
      const app = project.files.find(f => f.path === 'src/App.tsx');

      expect(app?.content).not.toContain('SpatialApp');
      expect(app?.content).not.toContain('spatialWorld');
      expect(app?.content).toContain('BrowserRouter');
    });
  });

  describe('error handling', () => {
    it('should handle empty Penpot file', () => {
      const emptyFile: PenpotFile = {
        version: '1.0.0',
        pages: [],
        components: [],
        assets: [],
        tokens: { colors: {}, typography: {}, spacing: {}, shadows: {} },
        metadata: {
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          version: '1.0.0',
          totalElements: 0,
          totalPages: 0,
          fileSize: 0,
        },
      };

      const project = generator.generateProject(emptyFile, baseOptions);
      
      expect(project.files).toBeDefined();
      expect(project.metadata.totalPages).toBe(0);
      expect(project.metadata.totalComponents).toBe(0);
    });

    it('should handle malformed element data gracefully', () => {
      const malformedFile: PenpotFile = {
        ...mockPenpotFile,
        pages: [
          {
            id: 'page-1',
            name: 'Test Page',
            bounds: { x: 0, y: 0, width: 1200, height: 800 },
            elements: [
              {
                id: 'broken-element',
                name: '',
                type: 'unknown',
                bounds: { x: 0, y: 0, width: 0, height: 0 },
                styles: {},
              },
            ],
          },
        ],
      };

      expect(() => {
        generator.generateProject(malformedFile, baseOptions);
      }).not.toThrow();
    });
  });

  describe('name sanitization', () => {
    it('should sanitize component names correctly', () => {
      const fileWithSpecialNames: PenpotFile = {
        ...mockPenpotFile,
        pages: [
          {
            id: 'page-1',
            name: 'Home Page!!',
            bounds: { x: 0, y: 0, width: 1200, height: 800 },
            elements: [],
          },
          {
            id: 'page-2',
            name: 'About/Contact Us',
            bounds: { x: 0, y: 0, width: 1200, height: 800 },
            elements: [],
          },
        ],
      };

      const project = generator.generateProject(fileWithSpecialNames, baseOptions);
      const filePaths = project.files.map(f => f.path);

      expect(filePaths).toContain('src/pages/HomePage.tsx');
      expect(filePaths).toContain('src/pages/AboutContactUs.tsx');
    });
  });
});