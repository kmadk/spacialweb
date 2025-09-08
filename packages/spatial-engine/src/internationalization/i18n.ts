/**
 * Internationalization support for spatial engine accessibility
 * Provides localized text for screen readers and UI elements
 */

export interface I18nStrings {
  // Navigation messages
  navigation: {
    zoomIn: string;
    zoomOut: string;
    zoomReset: string;
    panUp: string;
    panDown: string;
    panLeft: string;
    panRight: string;
    focusNext: string;
    focusPrevious: string;
    activate: string;
    clearFocus: string;
  };

  // Spatial descriptions
  spatial: {
    viewport: string;
    elementsVisible: string;
    noElements: string;
    centered: string;
    leftOfCenter: string;
    rightOfCenter: string;
    aboveCenter: string;
    belowCenter: string;
    nearbyElements: {
      above: string;
      below: string;
      left: string;
      right: string;
    };
  };

  // Accessibility announcements
  accessibility: {
    keyboardEnabled: string;
    keyboardDisabled: string;
    elementFocused: string;
    elementActivated: string;
    helpAvailable: string;
    memoryLeak: string;
    performanceWarning: string;
  };

  // Element descriptions
  elements: {
    rectangle: string;
    circle: string;
    text: string;
    image: string;
    button: string;
    link: string;
    heading: string;
    generic: string;
  };

  // Measurements and units
  units: {
    pixels: string;
    percent: string;
    zoom: string;
    position: string;
    size: string;
  };

  // Help and instructions
  help: {
    keyboardShortcuts: string;
    navigationInstructions: string;
    zoomInstructions: string;
    focusInstructions: string;
    activationInstructions: string;
  };
}

const defaultStrings: I18nStrings = {
  navigation: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom',
    panUp: 'Pan up',
    panDown: 'Pan down',
    panLeft: 'Pan left',
    panRight: 'Pan right',
    focusNext: 'Focus next element',
    focusPrevious: 'Focus previous element',
    activate: 'Activate element',
    clearFocus: 'Clear focus',
  },
  spatial: {
    viewport: 'viewport',
    elementsVisible: 'elements visible',
    noElements: 'No elements available',
    centered: 'centered in view',
    leftOfCenter: 'left of center',
    rightOfCenter: 'right of center',
    aboveCenter: 'above center',
    belowCenter: 'below center',
    nearbyElements: {
      above: 'Above',
      below: 'Below',
      left: 'To the left',
      right: 'To the right',
    },
  },
  accessibility: {
    keyboardEnabled: 'Keyboard navigation enabled',
    keyboardDisabled: 'Keyboard navigation disabled',
    elementFocused: 'Focused',
    elementActivated: 'Activated',
    helpAvailable: 'Press question mark for keyboard shortcuts',
    memoryLeak: 'Memory usage is high, consider reducing content',
    performanceWarning: 'Performance degraded, reducing visual effects',
  },
  elements: {
    rectangle: 'rectangle',
    circle: 'circle',
    text: 'text',
    image: 'image',
    button: 'button',
    link: 'link',
    heading: 'heading',
    generic: 'element',
  },
  units: {
    pixels: 'pixels',
    percent: 'percent',
    zoom: 'zoom',
    position: 'position',
    size: 'size',
  },
  help: {
    keyboardShortcuts: 'Keyboard shortcuts available',
    navigationInstructions: 'Use arrow keys to pan around the content',
    zoomInstructions: 'Use plus and minus keys to zoom in and out',
    focusInstructions: 'Use Tab key to navigate between elements',
    activationInstructions: 'Use Enter or Space to activate focused elements',
  },
};

// Localization data for different languages
const localizations: Record<string, Partial<I18nStrings>> = {
  'es': {
    navigation: {
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      zoomReset: 'Restablecer zoom',
      panUp: 'Desplazar arriba',
      panDown: 'Desplazar abajo',
      panLeft: 'Desplazar izquierda',
      panRight: 'Desplazar derecha',
      focusNext: 'Enfocar siguiente elemento',
      focusPrevious: 'Enfocar elemento anterior',
      activate: 'Activar elemento',
      clearFocus: 'Limpiar enfoque',
    },
    spatial: {
      viewport: 'ventana',
      elementsVisible: 'elementos visibles',
      noElements: 'No hay elementos disponibles',
      centered: 'centrado en la vista',
      leftOfCenter: 'izquierda del centro',
      rightOfCenter: 'derecha del centro',
      aboveCenter: 'arriba del centro',
      belowCenter: 'debajo del centro',
      nearbyElements: {
        above: 'Arriba',
        below: 'Abajo',
        left: 'A la izquierda',
        right: 'A la derecha',
      },
    },
    accessibility: {
      keyboardEnabled: 'Navegación por teclado habilitada',
      keyboardDisabled: 'Navegación por teclado deshabilitada',
      elementFocused: 'Enfocado',
      elementActivated: 'Activado',
      helpAvailable: 'Presiona signo de interrogación para atajos de teclado',
      memoryLeak: 'El uso de memoria es alto, considera reducir el contenido',
      performanceWarning: 'Rendimiento degradado, reduciendo efectos visuales',
    },
  },
  'fr': {
    navigation: {
      zoomIn: 'Zoomer',
      zoomOut: 'Dézoomer',
      zoomReset: 'Réinitialiser le zoom',
      panUp: 'Déplacer vers le haut',
      panDown: 'Déplacer vers le bas',
      panLeft: 'Déplacer vers la gauche',
      panRight: 'Déplacer vers la droite',
      focusNext: 'Élément suivant',
      focusPrevious: 'Élément précédent',
      activate: 'Activer élément',
      clearFocus: 'Effacer le focus',
    },
    spatial: {
      viewport: 'fenêtre',
      elementsVisible: 'éléments visibles',
      noElements: 'Aucun élément disponible',
      centered: 'centré dans la vue',
      leftOfCenter: 'à gauche du centre',
      rightOfCenter: 'à droite du centre',
      aboveCenter: 'au-dessus du centre',
      belowCenter: 'en dessous du centre',
      nearbyElements: {
        above: 'Au-dessus',
        below: 'En dessous',
        left: 'À gauche',
        right: 'À droite',
      },
    },
    accessibility: {
      keyboardEnabled: 'Navigation au clavier activée',
      keyboardDisabled: 'Navigation au clavier désactivée',
      elementFocused: 'Focalisé',
      elementActivated: 'Activé',
      helpAvailable: 'Appuyez sur point d\'interrogation pour les raccourcis clavier',
      memoryLeak: 'L\'utilisation mémoire est élevée, considérez réduire le contenu',
      performanceWarning: 'Performance dégradée, réduction des effets visuels',
    },
  },
  'de': {
    navigation: {
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      zoomReset: 'Zoom zurücksetzen',
      panUp: 'Nach oben schwenken',
      panDown: 'Nach unten schwenken',
      panLeft: 'Nach links schwenken',
      panRight: 'Nach rechts schwenken',
      focusNext: 'Nächstes Element fokussieren',
      focusPrevious: 'Vorheriges Element fokussieren',
      activate: 'Element aktivieren',
      clearFocus: 'Fokus löschen',
    },
    spatial: {
      viewport: 'Ansichtsfenster',
      elementsVisible: 'Elemente sichtbar',
      noElements: 'Keine Elemente verfügbar',
      centered: 'in der Ansicht zentriert',
      leftOfCenter: 'links der Mitte',
      rightOfCenter: 'rechts der Mitte',
      aboveCenter: 'über der Mitte',
      belowCenter: 'unter der Mitte',
      nearbyElements: {
        above: 'Oben',
        below: 'Unten',
        left: 'Links',
        right: 'Rechts',
      },
    },
    accessibility: {
      keyboardEnabled: 'Tastaturnavigation aktiviert',
      keyboardDisabled: 'Tastaturnavigation deaktiviert',
      elementFocused: 'Fokussiert',
      elementActivated: 'Aktiviert',
      helpAvailable: 'Drücken Sie Fragezeichen für Tastaturkürzel',
      memoryLeak: 'Speicherverbrauch ist hoch, erwägen Sie Inhalte zu reduzieren',
      performanceWarning: 'Leistung verschlechtert, visuelle Effekte werden reduziert',
    },
  },
  'ja': {
    navigation: {
      zoomIn: 'ズームイン',
      zoomOut: 'ズームアウト',
      zoomReset: 'ズームリセット',
      panUp: '上に移動',
      panDown: '下に移動',
      panLeft: '左に移動',
      panRight: '右に移動',
      focusNext: '次の要素にフォーカス',
      focusPrevious: '前の要素にフォーカス',
      activate: '要素をアクティブ化',
      clearFocus: 'フォーカスをクリア',
    },
    spatial: {
      viewport: 'ビューポート',
      elementsVisible: '個の要素が表示中',
      noElements: '利用可能な要素がありません',
      centered: 'ビューの中央',
      leftOfCenter: '中央の左',
      rightOfCenter: '中央の右',
      aboveCenter: '中央の上',
      belowCenter: '中央の下',
      nearbyElements: {
        above: '上',
        below: '下',
        left: '左',
        right: '右',
      },
    },
    accessibility: {
      keyboardEnabled: 'キーボードナビゲーションが有効',
      keyboardDisabled: 'キーボードナビゲーションが無効',
      elementFocused: 'フォーカス中',
      elementActivated: 'アクティブ化',
      helpAvailable: 'キーボードショートカットは疑問符キーを押してください',
      memoryLeak: 'メモリ使用量が多いです。コンテンツを減らすことを検討してください',
      performanceWarning: 'パフォーマンスが低下しました。視覚効果を減らしています',
    },
  },
};

export class I18nManager {
  private currentLocale = 'en';
  private strings: I18nStrings;

  constructor(locale = 'en') {
    this.setLocale(locale);
  }

  /**
   * Set the current locale
   */
  setLocale(locale: string): void {
    this.currentLocale = locale;
    this.strings = this.mergeStrings(defaultStrings, localizations[locale] || {});
  }

  /**
   * Get the current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Get a translated string by key path
   */
  t(keyPath: string, params?: Record<string, any>): string {
    const keys = keyPath.split('.');
    let value: any = this.strings;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        console.warn(`I18n: Missing translation for key: ${keyPath}`);
        return keyPath;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`I18n: Invalid translation value for key: ${keyPath}`);
      return keyPath;
    }

    return this.interpolate(value, params);
  }

  /**
   * Get all strings for current locale
   */
  getStrings(): I18nStrings {
    return this.strings;
  }

  /**
   * Add custom translations for a locale
   */
  addTranslations(locale: string, translations: Partial<I18nStrings>): void {
    if (!localizations[locale]) {
      localizations[locale] = {};
    }
    
    localizations[locale] = this.mergeStrings(localizations[locale], translations);
    
    // Update current strings if this is the active locale
    if (locale === this.currentLocale) {
      this.setLocale(locale);
    }
  }

  /**
   * Get available locales
   */
  getAvailableLocales(): string[] {
    return ['en', ...Object.keys(localizations)];
  }

  /**
   * Format numbers according to locale
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }

  /**
   * Format percentages according to locale
   */
  formatPercent(value: number): string {
    return this.formatNumber(value, { style: 'percent', maximumFractionDigits: 1 });
  }

  /**
   * Format distances/measurements
   */
  formatDistance(pixels: number): string {
    if (pixels < 1000) {
      return `${Math.round(pixels)} ${this.t('units.pixels')}`;
    } else {
      return `${this.formatNumber(pixels / 1000, { maximumFractionDigits: 1 })}k ${this.t('units.pixels')}`;
    }
  }

  /**
   * Format zoom levels
   */
  formatZoom(zoom: number): string {
    return `${this.formatPercent(zoom)} ${this.t('units.zoom')}`;
  }

  /**
   * Get spatial direction text
   */
  getDirection(dx: number, dy: number): string {
    const directions = [];
    
    if (Math.abs(dy) > 10) {
      directions.push(dy > 0 ? this.t('spatial.belowCenter') : this.t('spatial.aboveCenter'));
    }
    
    if (Math.abs(dx) > 10) {
      directions.push(dx > 0 ? this.t('spatial.rightOfCenter') : this.t('spatial.leftOfCenter'));
    }
    
    return directions.length > 0 ? directions.join(' and ') : this.t('spatial.centered');
  }

  /**
   * Generate element count description
   */
  getElementCountDescription(count: number): string {
    if (count === 0) {
      return this.t('spatial.noElements');
    }
    
    return `${this.formatNumber(count)} ${this.t('spatial.elementsVisible')}`;
  }

  private mergeStrings(base: any, override: any): any {
    const result = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.mergeStrings(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  private interpolate(template: string, params?: Record<string, any>): string {
    if (!params) return template;
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }
}

// Global instance for easy access
export const i18n = new I18nManager();

// Convenience function for getting translations
export const t = (keyPath: string, params?: Record<string, any>) => i18n.t(keyPath, params);