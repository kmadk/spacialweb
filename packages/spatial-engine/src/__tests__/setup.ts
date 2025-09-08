// Jest setup for spatial engine tests
import 'jest-canvas-mock';

// Mock deck.gl classes that might not work in jsdom
const mockDeck = {
  Deck: jest.fn().mockImplementation(() => ({
    setProps: jest.fn(),
    finalize: jest.fn(),
    getViewState: jest.fn(() => ({ longitude: 0, latitude: 0, zoom: 0 })),
  })),
  WebMercatorViewport: jest.fn().mockImplementation(() => ({
    project: jest.fn((coords) => coords),
    unproject: jest.fn((coords) => coords),
  })),
};

Object.defineProperty(global, 'deck', {
  value: mockDeck,
  writable: true,
});

// Mock requestAnimationFrame
Object.defineProperty(global, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16);
  },
  writable: true,
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: (id: number) => {
    clearTimeout(id);
  },
  writable: true,
});

// Mock performance.now if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
  } as any;
}

// Suppress console errors in tests unless explicitly testing error cases
const originalError = console.error;
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (args[0]?.toString().includes('Test error') || 
        args[0]?.toString().includes('Task') && args[0]?.toString().includes('failed')) {
      // Allow expected test errors
      return;
    }
    originalError(...args);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});