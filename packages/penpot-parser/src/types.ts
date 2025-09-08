export type ElementType =
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'image'
  | 'group'
  | 'frame'
  | 'component'
  | 'instance'
  | 'unknown';

export interface PenpotFile {
  version: string;
  pages: PenpotPage[];
  components: PenpotComponent[];
  assets: PenpotAsset[];
  tokens: DesignTokens;
  metadata: FileMetadata;
}

export interface PenpotPage {
  id: string;
  name: string;
  elements: PenpotElement[];
  bounds: BoundingBox;
}

export interface PenpotComponent {
  id: string;
  name: string;
  elements: PenpotElement[];
  bounds: BoundingBox;
}

export interface PenpotElement {
  id: string;
  name: string;
  type: ElementType;
  bounds: BoundingBox;
  styles: ElementStyles;
  children?: PenpotElement[];
  interactions?: Interaction[];
  data?: DataBinding;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementStyles {
  fill?: FillStyle;
  stroke?: StrokeStyle;
  typography?: TypographyStyle;
  layout?: LayoutStyle;
  effects?: Effect[];
}

export interface FillStyle {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  opacity?: number;
  gradient?: GradientStyle;
  image?: ImageFill;
}

export interface StrokeStyle {
  color: string;
  width: number;
  opacity?: number;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color: string;
  textDecoration?: 'none' | 'underline' | 'line-through';
}

export interface LayoutStyle {
  display?: 'flex' | 'grid' | 'block' | 'inline';
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap?: number;
  padding?: Spacing;
  margin?: Spacing;
}

export interface GradientStyle {
  type: 'linear' | 'radial';
  angle?: number;
  stops: GradientStop[];
}

export interface GradientStop {
  offset: number;
  color: string;
}

export interface ImageFill {
  url: string;
  size: 'contain' | 'cover' | 'stretch';
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export interface Effect {
  type: 'shadow' | 'blur' | 'glow';
  blur: number;
  color?: string;
  offset?: { x: number; y: number };
  opacity?: number;
}

export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Interaction {
  trigger: 'click' | 'hover' | 'submit' | 'change';
  action: InteractionAction;
  target?: string;
  parameters?: Record<string, any>;
}

export interface InteractionAction {
  type: 'navigate' | 'external-link' | 'form-submit' | 'custom';
  target?: string;
  url?: string;
  endpoint?: string;
  parameters?: Record<string, any>;
}

export interface DataBinding {
  source: 'api' | 'state' | 'props' | 'static';
  endpoint?: string;
  transforms?: DataTransform[];
  fallback?: any;
}

export interface DataTransform {
  type: 'map' | 'filter' | 'sort' | 'format';
  parameters: Record<string, any>;
}

export interface PenpotAsset {
  id: string;
  name: string;
  type: 'image' | 'font' | 'icon';
  path: string;
  data?: ArrayBuffer;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
  };
}

export interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, TypographyStyle>;
  spacing: Record<string, number>;
  shadows: Record<string, Effect>;
}

export interface FileMetadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
  version: string;
  totalElements: number;
  totalPages: number;
  fileSize: number;
}