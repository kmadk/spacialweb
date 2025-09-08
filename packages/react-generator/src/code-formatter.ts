import prettier from 'prettier';

export class CodeFormatter {
  async format(code: string, type: 'typescript' | 'css' | 'json' | 'html' = 'typescript'): Promise<string> {
    try {
      const options = this.getFormatterOptions(type);
      return await prettier.format(code, options);
    } catch (error) {
      console.warn('Failed to format code:', error);
      return code;
    }
  }

  formatSync(code: string, type: 'typescript' | 'css' | 'json' | 'html' = 'typescript'): string {
    try {
      const options = this.getFormatterOptions(type);
      return prettier.formatSync ? prettier.formatSync(code, options) : code;
    } catch (error) {
      console.warn('Failed to format code:', error);
      return code;
    }
  }

  private getFormatterOptions(type: string): prettier.Options {
    const baseOptions: prettier.Options = {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
    };

    switch (type) {
      case 'typescript':
        return {
          ...baseOptions,
          parser: 'typescript',
          jsxSingleQuote: true,
        };

      case 'css':
        return {
          ...baseOptions,
          parser: 'css',
        };

      case 'json':
        return {
          ...baseOptions,
          parser: 'json',
        };

      case 'html':
        return {
          ...baseOptions,
          parser: 'html',
          htmlWhitespaceSensitivity: 'css',
        };

      default:
        return {
          ...baseOptions,
          parser: 'typescript',
        };
    }
  }

  minify(code: string, type: 'typescript' | 'css' | 'json' = 'typescript'): string {
    try {
      const options = {
        ...this.getFormatterOptions(type),
        printWidth: 1000,
        tabWidth: 0,
        semi: false,
        singleQuote: true,
        trailingComma: 'none' as const,
      };

      const formatted = prettier.formatSync ? prettier.formatSync(code, options) : code;
      return formatted
        .replace(/\s+/g, ' ')
        .replace(/;\s/g, ';')
        .trim();
    } catch (error) {
      console.warn('Failed to minify code:', error);
      return code;
    }
  }

  validateSyntax(code: string, type: 'typescript' | 'css' | 'json' = 'typescript'): boolean {
    try {
      this.formatSync(code, type);
      return true;
    } catch {
      return false;
    }
  }

  extractImports(code: string): string[] {
    const importRegex = /^import\s+.+\s+from\s+['"]([^'"]+)['"];?/gm;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  addImport(code: string, importStatement: string): string {
    const lines = code.split('\n');
    const importIndex = lines.findIndex(line => line.startsWith('import'));
    
    if (importIndex === -1) {
      return importStatement + '\n\n' + code;
    }

    let lastImportIndex = importIndex;
    for (let i = importIndex; i < lines.length; i++) {
      if (lines[i].startsWith('import') || lines[i].trim() === '') {
        lastImportIndex = i;
      } else {
        break;
      }
    }

    lines.splice(lastImportIndex + 1, 0, importStatement);
    return lines.join('\n');
  }

  removeUnusedImports(code: string): string {
    const lines = code.split('\n');
    const codeWithoutImports = lines.filter(line => !line.startsWith('import')).join('\n');
    const importLines = lines.filter(line => line.startsWith('import'));

    const usedImports = importLines.filter(importLine => {
      const importMatch = importLine.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))/);
      if (!importMatch) return true;

      const [, namedImports, namespaceImport, defaultImport] = importMatch;
      
      if (defaultImport) {
        return codeWithoutImports.includes(defaultImport);
      }
      
      if (namespaceImport) {
        return codeWithoutImports.includes(namespaceImport);
      }
      
      if (namedImports) {
        const imports = namedImports.split(',').map(imp => imp.trim());
        return imports.some(imp => codeWithoutImports.includes(imp));
      }
      
      return true;
    });

    return [...usedImports, '', ...lines.filter(line => !line.startsWith('import') && line.trim() !== '')].join('\n');
  }
}