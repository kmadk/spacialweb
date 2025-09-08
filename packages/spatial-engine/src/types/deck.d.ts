declare module '@deck.gl/core' {
  export class Layer<Props = any> {
    constructor(props?: Props);
    shouldUpdateState(changeFlags: any): boolean;
    updateState(changeFlags: any): void;
    draw(opts: any): void;
    getShaders(): any;
    initializeState(): void;
    finalizeState(): void;
    getPickingInfo(params: any): any;
  }

  export class Deck {
    constructor(props: any);
    setProps(props: any): void;
    finalize(): void;
  }

  export const COORDINATE_SYSTEM: {
    CARTESIAN: number;
    LNGLAT: number;
  };
}

declare module '@deck.gl/layers' {
  import { Layer } from '@deck.gl/core';

  export class ScatterplotLayer<D = any> extends Layer<{
    data: D[];
    getPosition: (d: D) => [number, number] | [number, number, number];
    getRadius?: (d: D) => number;
    getFillColor?: (d: D) => [number, number, number] | [number, number, number, number];
    radiusScale?: number;
    radiusMinPixels?: number;
    radiusMaxPixels?: number;
  }> {}

  export class PolygonLayer<D = any> extends Layer<{
    data: D[];
    getPolygon: (d: D) => number[][];
    getFillColor?: (d: D) => [number, number, number] | [number, number, number, number];
    getLineColor?: (d: D) => [number, number, number] | [number, number, number, number];
    getLineWidth?: (d: D) => number;
    filled?: boolean;
    stroked?: boolean;
  }> {}

  export class TextLayer<D = any> extends Layer<{
    data: D[];
    getPosition: (d: D) => [number, number] | [number, number, number];
    getText: (d: D) => string;
    getColor?: (d: D) => [number, number, number] | [number, number, number, number];
    getSize?: (d: D) => number;
    getAngle?: (d: D) => number;
    fontFamily?: string;
    fontWeight?: string;
  }> {}

  export class BitmapLayer<D = any> extends Layer<{
    data?: D[];
    image: string | ImageBitmap | HTMLImageElement;
    bounds: [number, number, number, number];
  }> {}
}