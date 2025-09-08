import type {
  PenpotFile,
  PenpotPage,
  PenpotElement,
  PenpotComponent,
  Interaction,
  InteractionAction,
} from '@fir/penpot-parser';
import type {
  GenerationOptions,
  GeneratedProject,
  GeneratedFile,
  ProcessedAsset,
  TemplateData,
  SpatialWorldConfig,
  SpatialRoute,
} from './types.js';
import { TemplateEngine } from './template-engine.js';
import { CodeFormatter } from './code-formatter.js';

export class ReactGenerator {
  private templateEngine: TemplateEngine;
  private codeFormatter: CodeFormatter;

  constructor() {
    this.templateEngine = new TemplateEngine();
    this.codeFormatter = new CodeFormatter();
  }

  generateProject(penpotFile: PenpotFile, options: GenerationOptions): GeneratedProject {
    const components = this.generateComponents(penpotFile, options);
    const spatialApp = this.generateSpatialApp(penpotFile, components, options);
    const mainTsx = this.generateMainTsx();
    const packageJson = this.generatePackageJson(options);
    const configFiles = this.generateConfigFiles(options);

    const allFiles = [
      ...components,
      spatialApp,
      mainTsx,
      packageJson,
      ...configFiles,
    ];

    return {
      files: allFiles,
      assets: this.processAssets(penpotFile.assets),
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        framework: options.framework,
        spatialEngine: options.spatialNavigation,
        totalComponents: penpotFile.components.length,
        totalPages: penpotFile.pages.length,
      },
    };
  }

  private generateComponents(penpotFile: PenpotFile, options: GenerationOptions): GeneratedFile[] {
    const componentFiles: GeneratedFile[] = [];

    for (const page of penpotFile.pages) {
      const componentCode = this.generatePageComponent(page, options);
      componentFiles.push({
        path: `src/pages/${this.sanitizeName(page.name)}.tsx`,
        content: componentCode,
        type: 'typescript',
      });
    }

    for (const component of penpotFile.components) {
      const componentCode = this.generateReusableComponent(component, options);
      componentFiles.push({
        path: `src/components/${this.sanitizeName(component.name)}.tsx`,
        content: componentCode,
        type: 'typescript',
      });
    }

    return componentFiles;
  }

  private generatePageComponent(page: PenpotPage, options: GenerationOptions): string {
    const componentName = this.toPascalCase(page.name);
    const spatialElements = this.convertToSpatialElements(page.elements);
    const imports = this.generateImports(page.elements, options);

    const templateData: TemplateData = {
      componentName,
      imports: [
        "import React from 'react';",
        ...(options.spatialNavigation ? ["import { SpatialRegion } from '@fir/spatial-runtime';"] : []),
        ...imports,
      ],
      props: {
        onNavigate: {
          type: 'function',
          signature: '(target: string) => void',
          optional: true,
        },
      },
      jsx: this.generatePageJSX(page, options, spatialElements),
    };

    const code = this.templateEngine.generateComponent(templateData);
    return this.codeFormatter.formatSync(code);
  }

  private generatePageJSX(page: PenpotPage, options: GenerationOptions, spatialElements: any[]): string {
    if (options.spatialNavigation) {
      return `    <SpatialRegion
      id="${page.id}"
      bounds={${JSON.stringify(page.bounds, null, 6)}}
      elements={${JSON.stringify(spatialElements, null, 6)}}
    >
${this.generateElementsJSX(page.elements, 6)}
    </SpatialRegion>`;
    }

    return `    <div className="page" data-page-id="${page.id}">
${this.generateElementsJSX(page.elements, 6)}
    </div>`;
  }

  private generateReusableComponent(component: PenpotComponent, options: GenerationOptions): string {
    const componentName = this.toPascalCase(component.name);
    const imports = this.generateImports(component.elements, options);

    const templateData: TemplateData = {
      componentName,
      imports: [
        "import React from 'react';",
        ...imports,
      ],
      props: this.extractPropsFromComponent(component),
      jsx: `    <div className="component" data-component-id="${component.id}">
${this.generateElementsJSX(component.elements, 6)}
    </div>`,
    };

    const code = this.templateEngine.generateComponent(templateData);
    return this.codeFormatter.formatSync(code);
  }

  private generateElementsJSX(elements: PenpotElement[], indent = 0): string {
    const indentStr = ' '.repeat(indent);
    return elements
      .map(element => this.generateElementJSX(element, indent))
      .join('\n')
      .split('\n')
      .map(line => line ? indentStr + line : line)
      .join('\n');
  }

  private generateElementJSX(element: PenpotElement, indent = 0): string {
    switch (element.type) {
      case 'text':
        return this.generateTextJSX(element);
      case 'rectangle':
      case 'circle':
        return this.generateShapeJSX(element);
      case 'image':
        return this.generateImageJSX(element);
      case 'group':
        return this.generateGroupJSX(element, indent);
      default:
        return this.generateGenericJSX(element);
    }
  }

  private generateTextJSX(element: PenpotElement): string {
    const styles = this.generateInlineStyles(element.styles);
    const interactions = this.generateInteractionHandlers(element.interactions);

    return `<span
  id="${element.id}"
  style={${JSON.stringify(styles)}}
  ${interactions}
>
  ${element.data?.fallback || element.name}
</span>`;
  }

  private generateShapeJSX(element: PenpotElement): string {
    const styles = this.generateInlineStyles(element.styles);
    const interactions = this.generateInteractionHandlers(element.interactions);
    const tag = element.type === 'circle' ? 'div' : 'div';

    return `<${tag}
  id="${element.id}"
  style={${JSON.stringify(styles)}}
  ${interactions}
${element.children ? `>\n${this.generateElementsJSX(element.children, 2)}\n</${tag}` : ' />'}`;
  }

  private generateImageJSX(element: PenpotElement): string {
    const styles = this.generateInlineStyles(element.styles);
    const interactions = this.generateInteractionHandlers(element.interactions);

    return `<img
  id="${element.id}"
  src="${element.data?.fallback || '/placeholder.jpg'}"
  alt="${element.name}"
  style={${JSON.stringify(styles)}}
  ${interactions}
/>`;
  }

  private generateGroupJSX(element: PenpotElement, indent: number): string {
    const styles = this.generateInlineStyles(element.styles);
    const interactions = this.generateInteractionHandlers(element.interactions);

    return `<div
  id="${element.id}"
  className="group"
  style={${JSON.stringify(styles)}}
  ${interactions}
>
${element.children ? this.generateElementsJSX(element.children, indent + 2) : ''}
</div>`;
  }

  private generateGenericJSX(element: PenpotElement): string {
    const styles = this.generateInlineStyles(element.styles);
    const interactions = this.generateInteractionHandlers(element.interactions);

    return `<div
  id="${element.id}"
  className="${element.type}"
  style={${JSON.stringify(styles)}}
  ${interactions}
>
  {/* ${element.type} element */}
</div>`;
  }

  private generateInlineStyles(styles: any): Record<string, any> {
    const cssStyles: Record<string, any> = {};

    if (styles?.fill) {
      cssStyles.backgroundColor = styles.fill.color || '#transparent';
      if (styles.fill.opacity !== undefined) {
        cssStyles.opacity = styles.fill.opacity;
      }
    }

    if (styles?.stroke) {
      cssStyles.border = `${styles.stroke.width || 1}px ${styles.stroke.style || 'solid'} ${styles.stroke.color || '#000'}`;
    }

    if (styles?.typography) {
      cssStyles.fontFamily = styles.typography.fontFamily;
      cssStyles.fontSize = styles.typography.fontSize + 'px';
      cssStyles.fontWeight = styles.typography.fontWeight;
      cssStyles.color = styles.typography.color;
      cssStyles.textAlign = styles.typography.textAlign;
      if (styles.typography.lineHeight) {
        cssStyles.lineHeight = styles.typography.lineHeight;
      }
    }

    if (styles?.layout) {
      cssStyles.display = styles.layout.display;
      if (styles.layout.flexDirection) {
        cssStyles.flexDirection = styles.layout.flexDirection;
      }
      if (styles.layout.justifyContent) {
        cssStyles.justifyContent = styles.layout.justifyContent;
      }
      if (styles.layout.alignItems) {
        cssStyles.alignItems = styles.layout.alignItems;
      }
    }

    return cssStyles;
  }

  private generateInteractionHandlers(interactions?: Interaction[]): string {
    if (!interactions || interactions.length === 0) return '';

    const handlers: string[] = [];

    for (const interaction of interactions) {
      switch (interaction.trigger) {
        case 'click':
          handlers.push(`onClick={() => ${this.generateActionCode(interaction.action)}}`);
          break;
        case 'hover':
          handlers.push(`onMouseEnter={() => ${this.generateActionCode(interaction.action)}}`);
          break;
        case 'submit':
          handlers.push(`onSubmit={() => ${this.generateActionCode(interaction.action)}}`);
          break;
      }
    }

    return handlers.join(' ');
  }

  private generateActionCode(action: InteractionAction): string {
    switch (action.type) {
      case 'navigate':
        return `onNavigate?.('${action.target}')`;
      case 'external-link':
        return `window.open('${action.url}', '_blank')`;
      case 'form-submit':
        return `handleFormSubmit('${action.endpoint}')`;
      default:
        return 'console.log("Unhandled action")';
    }
  }

  private generateImports(elements: PenpotElement[]): string[] {
    const imports: string[] = [];
    
    // Add component imports based on element types
    const componentTypes = new Set<string>();
    this.collectComponentTypes(elements, componentTypes);

    for (const type of componentTypes) {
      if (type !== 'text' && type !== 'rectangle' && type !== 'circle' && type !== 'group') {
        imports.push(`import ${this.toPascalCase(type)} from '../components/${this.toPascalCase(type)}';`);
      }
    }

    return imports;
  }

  private collectComponentTypes(elements: PenpotElement[], types: Set<string>): void {
    for (const element of elements) {
      types.add(element.type);
      if (element.children) {
        this.collectComponentTypes(element.children, types);
      }
    }
  }

  private extractPropsFromComponent(component: PenpotComponent): Record<string, any> {
    const props: Record<string, any> = {};

    // Extract props from component elements
    this.extractPropsFromElements(component.elements, props);

    return props;
  }

  private extractPropsFromElements(elements: PenpotElement[], props: Record<string, any>): void {
    for (const element of elements) {
      if (element.data?.fallback && typeof element.data.fallback === 'object') {
        Object.assign(props, element.data.fallback);
      }

      if (element.children) {
        this.extractPropsFromElements(element.children, props);
      }
    }
  }

  private generateSpatialApp(
    penpotFile: PenpotFile,
    components: GeneratedFile[],
    options: GenerationOptions
  ): GeneratedFile {
    if (options.spatialNavigation) {
      return this.generateSpatialAppWithNavigation(penpotFile, components);
    }

    return this.generateStandardApp(penpotFile, components);
  }

  private generateSpatialAppWithNavigation(penpotFile: PenpotFile, components: GeneratedFile[]): GeneratedFile {
    const spatialWorld = this.generateSpatialWorldConfig(penpotFile);
    const routes = this.generateSpatialRoutes(penpotFile);
    const componentImports = this.generateComponentImports(components);

    const appCode = `import React from 'react';
import { SpatialApp, SpatialRouter } from '@fir/spatial-runtime';
${componentImports}

const spatialWorld = ${JSON.stringify(spatialWorld, null, 2)};

const routes = ${JSON.stringify(routes, null, 2)};

export const App: React.FC = () => {
  return (
    <SpatialApp world={spatialWorld}>
      <SpatialRouter routes={routes}>
        ${this.generateRouteComponents(penpotFile.pages)}
      </SpatialRouter>
    </SpatialApp>
  );
};

export default App;`;

    return {
      path: 'src/App.tsx',
      content: this.codeFormatter.formatSync(appCode),
      type: 'typescript',
    };
  }

  private generateStandardApp(penpotFile: PenpotFile, components: GeneratedFile[]): GeneratedFile {
    const componentImports = this.generateComponentImports(components);
    const routeComponents = this.generateRouteComponents(penpotFile.pages);

    const appCode = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
${componentImports}

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        ${routeComponents}
      </Routes>
    </Router>
  );
};

export default App;`;

    return {
      path: 'src/App.tsx',
      content: this.codeFormatter.formatSync(appCode),
      type: 'typescript',
    };
  }

  private generateSpatialWorldConfig(penpotFile: PenpotFile): SpatialWorldConfig {
    const allBounds = penpotFile.pages.map(page => page.bounds);
    const worldBounds = this.calculateWorldBounds(allBounds);

    return {
      bounds: worldBounds,
      elements: penpotFile.pages.flatMap(page => this.convertToSpatialElements(page.elements)),
      regions: penpotFile.pages.map(page => ({
        id: page.id,
        name: page.name,
        bounds: page.bounds,
        elements: this.convertToSpatialElements(page.elements),
        zoomRange: { min: 0.1, max: 10 },
      })),
      connections: [],
    };
  }

  private generateSpatialRoutes(penpotFile: PenpotFile): SpatialRoute[] {
    return penpotFile.pages.map(page => ({
      id: page.id,
      path: `/${this.sanitizeName(page.name)}`,
      component: this.toPascalCase(page.name),
      bounds: page.bounds,
    }));
  }

  private convertToSpatialElements(elements: PenpotElement[]): any[] {
    return elements.map(element => ({
      id: element.id,
      type: element.type,
      position: { x: element.bounds.x, y: element.bounds.y },
      bounds: element.bounds,
      data: element.data,
      children: element.children ? this.convertToSpatialElements(element.children) : undefined,
    }));
  }

  private calculateWorldBounds(bounds: any[]): any {
    if (bounds.length === 0) return { x: 0, y: 0, width: 1000, height: 1000 };

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const bound of bounds) {
      minX = Math.min(minX, bound.x);
      minY = Math.min(minY, bound.y);
      maxX = Math.max(maxX, bound.x + bound.width);
      maxY = Math.max(maxY, bound.y + bound.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private generateComponentImports(components: GeneratedFile[]): string {
    return components
      .filter(file => file.path.includes('/pages/') || file.path.includes('/components/'))
      .map(file => {
        const fileName = file.path.split('/').pop()?.replace('.tsx', '') || '';
        const componentName = this.toPascalCase(fileName);
        const relativePath = file.path.replace('src/', './').replace('.tsx', '');
        return `import ${componentName} from '${relativePath}';`;
      })
      .join('\n');
  }

  private generateRouteComponents(pages: PenpotPage[]): string {
    return pages
      .map(page => {
        const componentName = this.toPascalCase(page.name);
        const path = `/${this.sanitizeName(page.name)}`;
        return `        <Route path="${path}" element={<${componentName} />} />`;
      })
      .join('\n');
  }

  private generateMainTsx(): GeneratedFile {
    return {
      path: 'src/main.tsx',
      content: this.templateEngine.generateMainTsx(),
      type: 'typescript',
    };
  }

  private generatePackageJson(options: GenerationOptions): GeneratedFile {
    const projectName = options.projectName || 'spatial-app';
    
    return {
      path: 'package.json',
      content: this.templateEngine.generatePackageJson(projectName, options),
      type: 'json',
    };
  }

  private generateConfigFiles(options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [
      {
        path: 'vite.config.ts',
        content: this.templateEngine.generateViteConfig(),
        type: 'typescript',
      },
      {
        path: 'index.html',
        content: this.templateEngine.generateIndexHtml(options.projectName || 'Spatial App'),
        type: 'html',
      },
      {
        path: 'tsconfig.json',
        content: this.templateEngine.generateTsConfig(),
        type: 'json',
      },
      {
        path: '.gitignore',
        content: this.templateEngine.generateGitignore(),
        type: 'typescript',
      },
      {
        path: 'README.md',
        content: this.templateEngine.generateReadme(options.projectName || 'Spatial App'),
        type: 'typescript',
      },
    ];

    return files;
  }

  private processAssets(assets: any[]): ProcessedAsset[] {
    return assets.map(asset => ({
      id: asset.id,
      originalPath: asset.path,
      outputPath: `src/assets/${asset.path}`,
      data: asset.data,
      type: asset.type,
      optimized: false,
    }));
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}