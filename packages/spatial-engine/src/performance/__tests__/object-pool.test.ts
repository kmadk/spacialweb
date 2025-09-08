import { ObjectPool, PooledViewport, PooledBoundingBox, viewportPool, boundingBoxPool } from '../object-pool.js';

describe('ObjectPool', () => {
  let pool: ObjectPool<PooledViewport>;

  beforeEach(() => {
    pool = new ObjectPool(() => new PooledViewport(), 5, 20);
  });

  describe('basic functionality', () => {
    it('should pre-allocate initial objects', () => {
      const stats = pool.getStats();
      expect(stats.available).toBe(5);
      expect(stats.inUse).toBe(0);
      expect(stats.total).toBe(5);
    });

    it('should acquire objects from the pool', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();

      expect(obj1).toBeInstanceOf(PooledViewport);
      expect(obj2).toBeInstanceOf(PooledViewport);
      expect(obj1).not.toBe(obj2);

      const stats = pool.getStats();
      expect(stats.available).toBe(3);
      expect(stats.inUse).toBe(2);
      expect(stats.total).toBe(5);
    });

    it('should create new objects when pool is empty', () => {
      // Acquire all pre-allocated objects
      const objects = [];
      for (let i = 0; i < 5; i++) {
        objects.push(pool.acquire());
      }

      // Acquire one more (should create new)
      const newObj = pool.acquire();
      expect(newObj).toBeInstanceOf(PooledViewport);

      const stats = pool.getStats();
      expect(stats.available).toBe(0);
      expect(stats.inUse).toBe(6);
      expect(stats.total).toBe(6);
    });

    it('should release objects back to the pool', () => {
      const obj = pool.acquire();
      obj.set(100, 200, 1.5, 800, 600);

      pool.release(obj);

      const stats = pool.getStats();
      expect(stats.available).toBe(5);
      expect(stats.inUse).toBe(0);

      // Object should be reset
      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);
      expect(obj.zoom).toBe(1);
    });

    it('should not release objects not from this pool', () => {
      const externalObj = new PooledViewport();
      const initialStats = pool.getStats();

      pool.release(externalObj);

      const finalStats = pool.getStats();
      expect(finalStats).toEqual(initialStats);
    });
  });

  describe('pool size limits', () => {
    it('should respect max pool size', () => {
      // Fill pool beyond max size
      const objects = [];
      for (let i = 0; i < 25; i++) {
        objects.push(pool.acquire());
      }

      // Release all
      objects.forEach(obj => pool.release(obj));

      const stats = pool.getStats();
      expect(stats.available).toBeLessThanOrEqual(20); // maxSize
      expect(stats.inUse).toBe(0);
    });

    it('should not exceed max size even with many releases', () => {
      const objects = [];
      
      // Create more objects than max size
      for (let i = 0; i < 50; i++) {
        objects.push(pool.acquire());
      }

      // Release them gradually
      for (let i = 0; i < 30; i++) {
        pool.release(objects[i]);
      }

      const stats = pool.getStats();
      expect(stats.available).toBeLessThanOrEqual(20);
      expect(stats.inUse).toBe(20);
    });
  });

  describe('releaseAll functionality', () => {
    it('should release all objects in use', () => {
      const objects = [];
      for (let i = 0; i < 10; i++) {
        const obj = pool.acquire();
        obj.set(i * 100, i * 100, i, 800, 600);
        objects.push(obj);
      }

      pool.releaseAll();

      const stats = pool.getStats();
      expect(stats.inUse).toBe(0);
      expect(stats.available).toBeLessThanOrEqual(20);

      // All objects should be reset
      objects.forEach(obj => {
        expect(obj.x).toBe(0);
        expect(obj.y).toBe(0);
        expect(obj.zoom).toBe(1);
      });
    });

    it('should handle releaseAll with no objects in use', () => {
      const initialStats = pool.getStats();
      
      pool.releaseAll();
      
      const finalStats = pool.getStats();
      expect(finalStats).toEqual(initialStats);
    });
  });
});

describe('PooledViewport', () => {
  let viewport: PooledViewport;

  beforeEach(() => {
    viewport = new PooledViewport();
  });

  it('should set values correctly', () => {
    viewport.set(100, 200, 1.5, 800, 600);

    expect(viewport.x).toBe(100);
    expect(viewport.y).toBe(200);
    expect(viewport.zoom).toBe(1.5);
    expect(viewport.width).toBe(800);
    expect(viewport.height).toBe(600);
  });

  it('should reset to default values', () => {
    viewport.set(100, 200, 1.5, 800, 600);
    viewport.reset();

    expect(viewport.x).toBe(0);
    expect(viewport.y).toBe(0);
    expect(viewport.zoom).toBe(1);
    expect(viewport.width).toBe(0);
    expect(viewport.height).toBe(0);
  });

  it('should return itself for method chaining', () => {
    const result = viewport.set(100, 200, 1.5, 800, 600);
    expect(result).toBe(viewport);
  });
});

describe('PooledBoundingBox', () => {
  let bbox: PooledBoundingBox;

  beforeEach(() => {
    bbox = new PooledBoundingBox();
  });

  it('should set values correctly', () => {
    bbox.set(10, 20, 300, 400);

    expect(bbox.x).toBe(10);
    expect(bbox.y).toBe(20);
    expect(bbox.width).toBe(300);
    expect(bbox.height).toBe(400);
  });

  it('should reset to default values', () => {
    bbox.set(10, 20, 300, 400);
    bbox.reset();

    expect(bbox.x).toBe(0);
    expect(bbox.y).toBe(0);
    expect(bbox.width).toBe(0);
    expect(bbox.height).toBe(0);
  });

  it('should return itself for method chaining', () => {
    const result = bbox.set(10, 20, 300, 400);
    expect(result).toBe(bbox);
  });
});

describe('Global Pools', () => {
  beforeEach(() => {
    // Clean up global pools before each test
    viewportPool.releaseAll();
    boundingBoxPool.releaseAll();
  });

  describe('viewportPool', () => {
    it('should be properly configured', () => {
      const stats = viewportPool.getStats();
      expect(stats.available).toBe(20); // Initial size
      expect(stats.inUse).toBe(0);
    });

    it('should provide working viewport objects', () => {
      const viewport = viewportPool.acquire();
      viewport.set(100, 200, 1.5, 800, 600);

      expect(viewport.x).toBe(100);
      expect(viewport.y).toBe(200);
      expect(viewport.zoom).toBe(1.5);

      viewportPool.release(viewport);
      expect(viewport.x).toBe(0); // Should be reset
    });
  });

  describe('boundingBoxPool', () => {
    it('should be properly configured', () => {
      const stats = boundingBoxPool.getStats();
      expect(stats.available).toBe(50); // Initial size
      expect(stats.inUse).toBe(0);
    });

    it('should provide working bounding box objects', () => {
      const bbox = boundingBoxPool.acquire();
      bbox.set(10, 20, 300, 400);

      expect(bbox.x).toBe(10);
      expect(bbox.y).toBe(20);
      expect(bbox.width).toBe(300);
      expect(bbox.height).toBe(400);

      boundingBoxPool.release(bbox);
      expect(bbox.x).toBe(0); // Should be reset
    });
  });

  describe('pool stress test', () => {
    it('should handle rapid acquisition and release cycles', () => {
      const cycles = 1000;
      const objectsPerCycle = 10;

      for (let cycle = 0; cycle < cycles; cycle++) {
        const viewports = [];
        const bboxes = [];

        // Acquire objects
        for (let i = 0; i < objectsPerCycle; i++) {
          viewports.push(viewportPool.acquire());
          bboxes.push(boundingBoxPool.acquire());
        }

        // Use objects
        viewports.forEach((v, i) => v.set(i, i, 1, 800, 600));
        bboxes.forEach((b, i) => b.set(i, i, 100, 100));

        // Release objects
        viewports.forEach(v => viewportPool.release(v));
        bboxes.forEach(b => boundingBoxPool.release(b));
      }

      // Pools should be stable
      const viewportStats = viewportPool.getStats();
      const bboxStats = boundingBoxPool.getStats();

      expect(viewportStats.inUse).toBe(0);
      expect(bboxStats.inUse).toBe(0);
      expect(viewportStats.available).toBeLessThanOrEqual(100); // Max size
      expect(bboxStats.available).toBeLessThanOrEqual(500); // Max size
    });
  });
});