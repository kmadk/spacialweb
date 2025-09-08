import type { TemplateData } from './types.js';

export class TemplateEngine {
  generateComponent(data: TemplateData): string {
    const {
      componentName,
      imports,
      props,
      jsx,
      styles,
      interactions = [],
    } = data;

    const importsSection = imports.length > 0 
      ? imports.join('\n') + '\n\n'
      : '';

    const propsInterface = this.generatePropsInterface(componentName, props);
    
    const interactionsCode = interactions.length > 0
      ? this.generateInteractionsCode(interactions)
      : '';

    const stylesCode = styles 
      ? this.generateStylesCode(styles)
      : '';

    return `${importsSection}${propsInterface}

export const ${componentName}: React.FC<${componentName}Props> = ({${this.generatePropsDestructuring(props)}}) => {
${interactionsCode}
${stylesCode}
  return (
${jsx}
  );
};

export default ${componentName};`;
  }

  private generatePropsInterface(componentName: string, props: Record<string, any>): string {
    const propsEntries = Object.entries(props).map(([key, value]) => {
      const type = this.inferTypeFromValue(value);
      const optional = value?.optional ? '?' : '';
      return `  ${key}${optional}: ${type};`;
    });

    if (propsEntries.length === 0) {
      propsEntries.push('  children?: React.ReactNode;');
    }

    return `export interface ${componentName}Props {
${propsEntries.join('\n')}
}`;
  }

  private generatePropsDestructuring(props: Record<string, any>): string {
    const keys = Object.keys(props);
    return keys.length > 0 ? ` ${keys.join(', ')} ` : '';
  }

  private generateInteractionsCode(interactions: any[]): string {
    const handlers = interactions.map(interaction => {
      switch (interaction.action?.type) {
        case 'navigate':
          return `  const handle${this.capitalize(interaction.trigger)} = () => {
    onNavigate?.('${interaction.action.target}');
  };`;
        case 'external-link':
          return `  const handle${this.capitalize(interaction.trigger)} = () => {
    window.open('${interaction.action.url}', '_blank');
  };`;
        case 'form-submit':
          return `  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // Handle form submission
  };`;
        default:
          return `  const handle${this.capitalize(interaction.trigger)} = () => {
    console.log('${interaction.action?.type || 'unknown'} action');
  };`;
      }
    });

    return handlers.join('\n\n') + '\n';
  }

  private generateStylesCode(styles: Record<string, any>): string {
    const styleObject = JSON.stringify(styles, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");

    return `  const styles = ${styleObject};\n`;
  }

  private inferTypeFromValue(value: any): string {
    if (value === null || value === undefined) {
      return 'any';
    }

    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (typeof value === 'number') {
      return 'number';
    }

    if (typeof value === 'string') {
      return 'string';
    }

    if (Array.isArray(value)) {
      return 'any[]';
    }

    if (typeof value === 'object') {
      if (value.type === 'function') {
        return value.signature || '() => void';
      }
      return 'Record<string, any>';
    }

    return 'any';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  generatePackageJson(projectName: string, options: any): string {
    const packageData = {
      name: projectName,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        lint: 'eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
        'type-check': 'tsc --noEmit',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        ...(options.spatialNavigation && {
          '@fir/spatial-runtime': '^1.0.0',
          '@deck.gl/core': '^8.9.0',
          '@deck.gl/layers': '^8.9.0',
          '@deck.gl/react': '^8.9.0',
        }),
        ...(options.stateManagement === 'zustand' && {
          zustand: '^4.4.0',
        }),
        ...(options.cssFramework === 'styled-components' && {
          'styled-components': '^6.0.0',
        }),
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        '@vitejs/plugin-react': '^4.0.0',
        eslint: '^8.45.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        'eslint-plugin-react-refresh': '^0.4.0',
        typescript: '^5.0.2',
        vite: '^4.4.5',
        ...(options.cssFramework === 'styled-components' && {
          '@types/styled-components': '^5.1.0',
        }),
      },
    };

    return JSON.stringify(packageData, null, 2);
  }

  generateViteConfig(): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});`;
  }

  generateIndexHtml(projectName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  generateTsConfig(): string {
    return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;
  }

  generateMainTsx(): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`;
  }

  generateGitignore(): string {
    return `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`;
  }

  generateReadme(projectName: string): string {
    return `# ${projectName}

This is a spatial web application generated from Penpot designs.

## Features

- Infinite zoom navigation
- Smooth transitions between elements
- Generated React components
- Responsive design

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## Navigation

Use mouse wheel to zoom, click and drag to pan, or click on elements to navigate to them with smooth transitions.

## Project Structure

- \`src/components/\` - Generated React components
- \`src/pages/\` - Page components
- \`src/assets/\` - Static assets from Penpot
- \`src/App.tsx\` - Main spatial application
`;
  }
}