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
}