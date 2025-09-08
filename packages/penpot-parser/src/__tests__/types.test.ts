import { describe, it, expect } from 'vitest';
import type {
  PenpotFile,
  PenpotElement,
  ElementStyles,
  BoundingBox,
  Interaction,
  DataBinding,
} from '../types.js';

describe('Types', () => {
  describe('BoundingBox', () => {
    it('should have correct structure', () => {
      const bounds: BoundingBox = {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      };

      expect(bounds.x).toBe(10);
      expect(bounds.y).toBe(20);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(50);
    });
  });

  describe('PenpotElement', () => {
    it('should support all required properties', () => {
      const element: PenpotElement = {
        id: 'element-1',
        name: 'Test Element',
        type: 'rectangle',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        styles: {},
      };

      expect(element.id).toBe('element-1');
      expect(element.name).toBe('Test Element');
      expect(element.type).toBe('rectangle');
      expect(element.bounds).toBeDefined();
      expect(element.styles).toBeDefined();
    });

    it('should support optional properties', () => {
      const element: PenpotElement = {
        id: 'element-1',
        name: 'Test Element',
        type: 'group',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        styles: {},
        children: [
          {
            id: 'child-1',
            name: 'Child',
            type: 'rectangle',
            bounds: { x: 10, y: 10, width: 80, height: 80 },
            styles: {},
          },
        ],
        interactions: [
          {
            trigger: 'click',
            action: { type: 'navigate', target: 'page-2' },
          },
        ],
        data: {
          source: 'static',
          fallback: 'Default value',
        },
      };

      expect(element.children).toHaveLength(1);
      expect(element.interactions).toHaveLength(1);
      expect(element.data).toBeDefined();
    });
  });

  describe('ElementStyles', () => {
    it('should support fill styles', () => {
      const styles: ElementStyles = {
        fill: {
          type: 'solid',
          color: '#ff0000',
          opacity: 0.8,
        },
      };

      expect(styles.fill?.type).toBe('solid');
      expect(styles.fill?.color).toBe('#ff0000');
      expect(styles.fill?.opacity).toBe(0.8);
    });

    it('should support stroke styles', () => {
      const styles: ElementStyles = {
        stroke: {
          color: '#000000',
          width: 2,
          opacity: 1,
          style: 'solid',
        },
      };

      expect(styles.stroke?.color).toBe('#000000');
      expect(styles.stroke?.width).toBe(2);
      expect(styles.stroke?.style).toBe('solid');
    });

    it('should support typography styles', () => {
      const styles: ElementStyles = {
        typography: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 400,
          color: '#333333',
          textAlign: 'left',
          lineHeight: 1.5,
          letterSpacing: 0,
          textDecoration: 'none',
        },
      };

      expect(styles.typography?.fontFamily).toBe('Inter');
      expect(styles.typography?.fontSize).toBe(16);
      expect(styles.typography?.textAlign).toBe('left');
    });

    it('should support layout styles', () => {
      const styles: ElementStyles = {
        layout: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'stretch',
          gap: 16,
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          margin: { top: 0, right: 0, bottom: 16, left: 0 },
        },
      };

      expect(styles.layout?.display).toBe('flex');
      expect(styles.layout?.flexDirection).toBe('column');
      expect(styles.layout?.gap).toBe(16);
    });

    it('should support effects', () => {
      const styles: ElementStyles = {
        effects: [
          {
            type: 'shadow',
            blur: 4,
            color: '#000000',
            offset: { x: 2, y: 2 },
            opacity: 0.25,
          },
          {
            type: 'blur',
            blur: 2,
          },
        ],
      };

      expect(styles.effects).toHaveLength(2);
      expect(styles.effects?.[0].type).toBe('shadow');
      expect(styles.effects?.[1].type).toBe('blur');
    });
  });

  describe('Interaction', () => {
    it('should support navigation actions', () => {
      const interaction: Interaction = {
        trigger: 'click',
        action: {
          type: 'navigate',
          target: 'page-2',
        },
      };

      expect(interaction.trigger).toBe('click');
      expect(interaction.action.type).toBe('navigate');
      expect(interaction.action.target).toBe('page-2');
    });

    it('should support external link actions', () => {
      const interaction: Interaction = {
        trigger: 'click',
        action: {
          type: 'external-link',
          url: 'https://example.com',
        },
        parameters: {
          newTab: true,
        },
      };

      expect(interaction.action.type).toBe('external-link');
      expect(interaction.action.url).toBe('https://example.com');
      expect(interaction.parameters?.newTab).toBe(true);
    });

    it('should support form submit actions', () => {
      const interaction: Interaction = {
        trigger: 'submit',
        action: {
          type: 'form-submit',
          endpoint: '/api/contact',
          parameters: {
            method: 'POST',
          },
        },
      };

      expect(interaction.trigger).toBe('submit');
      expect(interaction.action.type).toBe('form-submit');
      expect(interaction.action.endpoint).toBe('/api/contact');
    });
  });

  describe('DataBinding', () => {
    it('should support static data source', () => {
      const binding: DataBinding = {
        source: 'static',
        fallback: 'Default text',
      };

      expect(binding.source).toBe('static');
      expect(binding.fallback).toBe('Default text');
    });

    it('should support API data source', () => {
      const binding: DataBinding = {
        source: 'api',
        endpoint: '/api/users',
        transforms: [
          {
            type: 'map',
            parameters: { field: 'name' },
          },
          {
            type: 'filter',
            parameters: { active: true },
          },
        ],
        fallback: [],
      };

      expect(binding.source).toBe('api');
      expect(binding.endpoint).toBe('/api/users');
      expect(binding.transforms).toHaveLength(2);
    });

    it('should support state data source', () => {
      const binding: DataBinding = {
        source: 'state',
        transforms: [
          {
            type: 'format',
            parameters: { currency: 'USD' },
          },
        ],
      };

      expect(binding.source).toBe('state');
      expect(binding.transforms?.[0].type).toBe('format');
    });
  });

  describe('PenpotFile', () => {
    it('should have complete structure', () => {
      const file: PenpotFile = {
        version: '1.0.0',
        pages: [
          {
            id: 'page-1',
            name: 'Home',
            elements: [],
            bounds: { x: 0, y: 0, width: 1200, height: 800 },
          },
        ],
        components: [
          {
            id: 'button',
            name: 'Button',
            elements: [],
            bounds: { x: 0, y: 0, width: 120, height: 40 },
          },
        ],
        assets: [
          {
            id: 'logo',
            name: 'logo.svg',
            type: 'icon',
            path: 'assets/logo.svg',
          },
        ],
        tokens: {
          colors: { primary: '#007bff' },
          typography: {},
          spacing: { sm: 8, md: 16, lg: 24 },
          shadows: {},
        },
        metadata: {
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
          version: '1.0.0',
          totalElements: 0,
          totalPages: 1,
          fileSize: 1024,
        },
      };

      expect(file.version).toBe('1.0.0');
      expect(file.pages).toHaveLength(1);
      expect(file.components).toHaveLength(1);
      expect(file.assets).toHaveLength(1);
      expect(file.tokens).toBeDefined();
      expect(file.metadata).toBeDefined();
    });
  });

  describe('ElementType', () => {
    it('should include all supported types', () => {
      const types = [
        'rectangle',
        'circle',
        'text',
        'image',
        'group',
        'frame',
        'component',
        'instance',
        'unknown',
      ];

      // Test that each type can be assigned
      types.forEach(type => {
        const element: PenpotElement = {
          id: 'test',
          name: 'Test',
          type: type as any,
          bounds: { x: 0, y: 0, width: 100, height: 100 },
          styles: {},
        };
        expect(element.type).toBe(type);
      });
    });
  });
});