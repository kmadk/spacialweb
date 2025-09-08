import type { PenpotFile, PenpotPage, PenpotElement, PenpotComponent } from '@fir/penpot-parser';

export interface GenerationOptions {
  projectName?: string;
  framework: 'react' | 'vue' | 'vanilla';
  typescript: boolean;
  spatialNavigation: boolean;
  cssFramework?: 'tailwind' | 'styled-components' | 'css-modules';
  stateManagement?: 'zustand' | 'redux' | 'context';
  outputDir?: string;
}

export interface ComponentOptions {
  includeStyles?: boolean;
  includeInteractions?: boolean;
  includeDataBinding?: boolean;
  exportAsDefault?: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'typescript' | 'javascript' | 'css' | 'json' | 'html';
}

export interface GeneratedProject {
  files: GeneratedFile[];
  assets: ProcessedAsset[];
  metadata: ProjectMetadata;
}

export interface ProcessedAsset {
  id: string;
  originalPath: string;
  outputPath: string;
  data: ArrayBuffer;
  type: 'image' | 'font' | 'icon';
  optimized?: boolean;
}

export interface ProjectMetadata {
  generatedAt: string;
  version: string;
  framework: string;
  spatialEngine: boolean;
  totalComponents: number;
  totalPages: number;
}

export interface TemplateData {
  componentName: string;
  imports: string[];
  props: Record<string, any>;
  jsx: string;
  styles?: Record<string, any>;
  interactions?: any[];
}

export interface SpatialWorldConfig {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  elements: any[];
  regions: any[];
  connections: any[];
}

export interface SpatialRoute {
  id: string;
  path: string;
  component: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}