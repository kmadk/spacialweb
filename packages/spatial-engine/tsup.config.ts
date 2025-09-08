import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'performance/index': 'src/performance/index.ts',
    'algorithms/index': 'src/algorithms/index.ts',
    'rendering/index': 'src/rendering/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  treeshake: true,
  splitting: true,
  target: 'esnext',
  platform: 'browser',
  external: [
    '@deck.gl/core',
    '@deck.gl/layers',
    '@deck.gl/react',
    'rbush',
    'd3-interpolate',
    'd3-ease',
  ],
  esbuildOptions(options) {
    // Optimize for size
    options.treeShaking = true;
    options.minifyIdentifiers = true;
    options.minifySyntax = true;
    options.minifyWhitespace = true;
    
    // Enable advanced optimizations
    options.legalComments = 'none';
    options.keepNames = false;
    
    // Dead code elimination
    options.define = {
      'process.env.NODE_ENV': '"production"',
      'DEBUG': 'false',
    };
  },
  onSuccess: async () => {
    console.log('✅ Build completed with tree-shaking optimizations');
  },
});