import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-spatial-engine');
    await page.waitForSelector('[data-testid="spatial-engine-loaded"]');
  });

  test('should render spatial engine correctly at different zoom levels', async ({ page }) => {
    // Load consistent test data
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const testElements = [
        {
          id: 'red-square',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 200, height: 200 },
          styles: { fill: '#ff0000' },
          children: [],
        },
        {
          id: 'blue-circle',
          type: 'circle',
          bounds: { x: 400, y: 200, width: 150, height: 150 },
          styles: { fill: '#0000ff' },
          children: [],
        },
        {
          id: 'green-triangle',
          type: 'polygon',
          bounds: { x: 200, y: 400, width: 100, height: 100 },
          styles: { fill: '#00ff00' },
          children: [],
        },
      ];
      
      return engine.setElements(testElements);
    });

    // Test different zoom levels
    const zoomLevels = [0.5, 1, 2, 4];
    
    for (const zoom of zoomLevels) {
      await page.evaluate((zoom) => {
        const engine = (window as any).spatialEngine;
        return engine.setViewport({ x: 300, y: 300, zoom, width: 800, height: 600 });
      }, zoom);

      await page.waitForTimeout(500); // Allow rendering to complete

      await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
        `spatial-render-zoom-${zoom}x.png`,
        {
          threshold: 0.3, // Allow for minor WebGL rendering differences
          animations: 'disabled',
        }
      );
    }
  });

  test('should maintain visual consistency during transitions', async ({ page }) => {
    // Load grid of elements for transition testing
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      for (let i = 0; i < 25; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        elements.push({
          id: `grid-${i}`,
          type: 'rectangle',
          bounds: {
            x: col * 200 + 50,
            y: row * 200 + 50,
            width: 150,
            height: 150,
          },
          styles: {
            fill: `hsl(${(i * 14.4) % 360}, 70%, 50%)`,
            stroke: '#000',
            strokeWidth: 2,
          },
          children: [],
        });
      }
      
      return engine.setElements(elements);
    });

    // Capture initial state
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.setViewport({ x: 500, y: 500, zoom: 1, width: 800, height: 600 });
    });

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'transition-start.png',
      { threshold: 0.3 }
    );

    // Capture during transition
    const transitionPromise = page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.setViewport({ x: 800, y: 400, zoom: 2.5, width: 800, height: 600 }, { duration: 1000 });
    });

    await page.waitForTimeout(500); // Capture mid-transition

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'transition-mid.png',
      { threshold: 0.4 } // Higher threshold for transition states
    );

    await transitionPromise; // Wait for transition to complete

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'transition-end.png',
      { threshold: 0.3 }
    );
  });

  test('should render elements correctly with different styles', async ({ page }) => {
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const styledElements = [
        // Gradient fills
        {
          id: 'gradient-rect',
          type: 'rectangle',
          bounds: { x: 50, y: 50, width: 200, height: 100 },
          styles: {
            fill: 'linear-gradient(45deg, #ff0000, #0000ff)',
            borderRadius: '10px',
          },
          children: [],
        },
        // Shadow effects
        {
          id: 'shadow-circle',
          type: 'circle',
          bounds: { x: 300, y: 50, width: 120, height: 120 },
          styles: {
            fill: '#00ff00',
            boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
          },
          children: [],
        },
        // Text with custom fonts
        {
          id: 'styled-text',
          type: 'text',
          bounds: { x: 50, y: 200, width: 300, height: 80 },
          styles: {
            fontFamily: 'Arial, sans-serif',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            background: 'rgba(255,255,0,0.2)',
            padding: '10px',
          },
          content: 'Styled Text Element',
          children: [],
        },
        // Complex borders
        {
          id: 'bordered-element',
          type: 'rectangle',
          bounds: { x: 400, y: 200, width: 150, height: 150 },
          styles: {
            fill: '#ffffff',
            border: '5px dashed #ff00ff',
            borderRadius: '20px',
          },
          children: [],
        },
      ];
      
      return engine.setElements(styledElements);
    });

    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.setViewport({ x: 300, y: 200, zoom: 1.5, width: 800, height: 600 });
    });

    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'styled-elements.png',
      { threshold: 0.3 }
    );
  });

  test('should handle element visibility at extreme zoom levels', async ({ page }) => {
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      // Create elements of various sizes
      const sizes = [
        { width: 1000, height: 1000, id: 'huge' },
        { width: 100, height: 100, id: 'large' },
        { width: 10, height: 10, id: 'medium' },
        { width: 1, height: 1, id: 'small' },
        { width: 0.1, height: 0.1, id: 'tiny' },
      ];
      
      sizes.forEach((size, i) => {
        elements.push({
          id: `size-${size.id}`,
          type: 'rectangle',
          bounds: {
            x: i * 200,
            y: 100,
            width: size.width,
            height: size.height,
          },
          styles: {
            fill: `hsl(${i * 60}, 70%, 50%)`,
            stroke: '#000',
            strokeWidth: Math.max(0.1, size.width * 0.01),
          },
          children: [],
        });
      });
      
      return engine.setElements(elements);
    });

    // Test extreme zoom out (should show large elements)
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.setViewport({ x: 500, y: 500, zoom: 0.01, width: 800, height: 600 });
    });

    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'extreme-zoom-out.png',
      { threshold: 0.4 }
    );

    // Test extreme zoom in (should show small elements)
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.setViewport({ x: 800, y: 100, zoom: 100, width: 800, height: 600 });
    });

    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'extreme-zoom-in.png',
      { threshold: 0.4 }
    );
  });

  test('should maintain rendering quality with thousands of elements', async ({ page }) => {
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [];
      
      // Create 2000 small elements in a pattern
      for (let i = 0; i < 2000; i++) {
        const angle = (i * Math.PI * 2) / 200;
        const radius = 50 + (i % 200) * 5;
        const x = 1000 + Math.cos(angle) * radius;
        const y = 1000 + Math.sin(angle) * radius;
        
        elements.push({
          id: `pattern-${i}`,
          type: 'circle',
          bounds: { x, y, width: 5, height: 5 },
          styles: {
            fill: `hsl(${(i * 1.8) % 360}, 70%, 50%)`,
          },
          children: [],
        });
      }
      
      return engine.setElements(elements);
    });

    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.setViewport({ x: 1000, y: 1000, zoom: 0.8, width: 800, height: 600 });
    });

    await page.waitForTimeout(1000); // Allow more time for complex rendering

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'high-density-elements.png',
      { 
        threshold: 0.5, // Higher threshold for complex scenes
        maxDiffPixels: 1000, // Allow more pixel differences
      }
    );

    // Test zoomed in view
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      return engine.setViewport({ x: 1200, y: 800, zoom: 5, width: 800, height: 600 });
    });

    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'high-density-zoomed.png',
      { threshold: 0.4 }
    );
  });

  test('should handle dark mode and theme variations', async ({ page }) => {
    // Test light theme
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [
        {
          id: 'theme-bg',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 800, height: 600 },
          styles: { fill: '#ffffff' },
          children: [],
        },
        {
          id: 'theme-content',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 600, height: 400 },
          styles: {
            fill: '#f0f0f0',
            border: '2px solid #ccc',
            borderRadius: '10px',
          },
          children: [],
        },
      ];
      
      return engine.setElements(elements);
    });

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'light-theme.png',
      { threshold: 0.2 }
    );

    // Test dark theme
    await page.evaluate(() => {
      const engine = (window as any).spatialEngine;
      const elements = [
        {
          id: 'dark-bg',
          type: 'rectangle',
          bounds: { x: 0, y: 0, width: 800, height: 600 },
          styles: { fill: '#1a1a1a' },
          children: [],
        },
        {
          id: 'dark-content',
          type: 'rectangle',
          bounds: { x: 100, y: 100, width: 600, height: 400 },
          styles: {
            fill: '#2d2d2d',
            border: '2px solid #555',
            borderRadius: '10px',
          },
          children: [],
        },
      ];
      
      return engine.setElements(elements);
    });

    await expect(page.locator('[data-testid="spatial-canvas"]')).toHaveScreenshot(
      'dark-theme.png',
      { threshold: 0.2 }
    );
  });
});