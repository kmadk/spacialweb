/**
 * Cinematic movement system that maps Penpot flows to spatial navigation
 * Automatically generates smooth, narrative-driven transitions between connected elements
 */

import type { SpatialElement, Viewport, TransitionOptions } from '../types.js';
// Using our own easing functions instead of d3-ease to avoid conflicts
import { CinematicEasingLibrary } from './cinematic-easing.js';
import { SpatialAudioEngine, type SpatialAudioOptions } from './spatial-audio.js';

export interface PenpotFlow {
  id: string;
  name: string;
  startingPoint: string; // Element ID
  connections: PenpotConnection[];
  metadata?: {
    storyboard?: boolean;
    presentation?: boolean;
    userJourney?: boolean;
  };
}

export interface PenpotConnection {
  id: string;
  fromElement: string;
  toElement: string;
  trigger: 'click' | 'hover' | 'auto' | 'scroll' | 'time' | 'custom';
  transitionType: 'dissolve' | 'slide' | 'push' | 'cover' | 'flip' | 'zoom' | 'custom';
  duration?: number;
  easing?: string;
  metadata?: {
    narrative?: string;
    emotion?: 'excitement' | 'calm' | 'dramatic' | 'playful' | 'professional';
    storytelling?: 'reveal' | 'focus' | 'journey' | 'comparison' | 'sequence';
  };
}

export interface CinematicMovement {
  name: string;
  description: string;
  calculate: (from: SpatialElement, to: SpatialElement, viewport: Viewport) => CinematicSequence;
}

export interface CinematicSequence {
  keyframes: CinematicKeyframe[];
  totalDuration: number;
  style: 'documentary' | 'cinematic' | 'dramatic' | 'playful' | 'professional';
}

export interface CinematicKeyframe {
  timestamp: number; // 0-1
  viewport: Partial<Viewport>;
  focus?: string; // Element ID to highlight
  effects?: {
    blur?: number;
    vignette?: number;
    spotlight?: { x: number; y: number; radius: number };
    parallax?: number;
  };
  audio?: {
    spatialSound?: boolean;
    doppler?: boolean;
  };
}

export class FlowChoreographer {
  private movements: Map<string, CinematicMovement> = new Map();
  private activeSequence: CinematicSequence | null = null;
  private spatialAudio: SpatialAudioEngine | null = null;
  
  constructor(audioOptions?: SpatialAudioOptions) {
    this.setupBuiltInMovements();
    
    // Initialize spatial audio if options provided
    if (audioOptions) {
      this.spatialAudio = new SpatialAudioEngine(audioOptions);
      this.spatialAudio.initialize().catch(error => {
        console.warn('Spatial audio initialization failed:', error);
      });
    }
  }

  /**
   * Parse Penpot flows and generate spatial layout with cinematic connections
   */
  public choreographFlows(flows: PenpotFlow[], elements: SpatialElement[]): {
    spatialLayout: Map<string, { x: number; y: number; bounds: any }>;
    cinematicConnections: Map<string, CinematicSequence>;
  } {
    const spatialLayout = new Map();
    const cinematicConnections = new Map();

    for (const flow of flows) {
      // Generate spatial positions based on flow narrative
      const layout = this.generateNarrativeLayout(flow, elements);
      
      // Create cinematic connections between flow steps
      for (const connection of flow.connections) {
        const sequence = this.createCinematicSequence(connection, elements, layout);
        cinematicConnections.set(connection.id, sequence);
      }

      // Update spatial layout
      for (const [elementId, position] of layout.entries()) {
        spatialLayout.set(elementId, position);
      }
    }

    return { spatialLayout, cinematicConnections };
  }

  /**
   * Execute a cinematic transition between connected elements
   */
  public async executeTransition(
    connectionId: string,
    engine: any,
    options: { 
      skipIntro?: boolean;
      fastMode?: boolean;
      narrativeVoice?: boolean;
    } = {}
  ): Promise<void> {
    const sequence = this.getSequence(connectionId);
    if (!sequence) return;

    this.activeSequence = sequence;
    
    const totalDuration = options.fastMode ? sequence.totalDuration * 0.5 : sequence.totalDuration;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const executeKeyframe = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);

        // Find current keyframe
        const currentKeyframe = this.getCurrentKeyframe(sequence, progress);
        
        if (currentKeyframe) {
          // Apply viewport changes
          if (currentKeyframe.viewport) {
            const currentViewport = engine.getViewport();
            const targetViewport = { ...currentViewport, ...currentKeyframe.viewport };
            engine.setViewport(targetViewport, { duration: 0 });
          }

          // Apply cinematic effects
          if (currentKeyframe.effects) {
            this.applyCinematicEffects(engine, currentKeyframe.effects);
          }

          // Apply focus and spotlight
          if (currentKeyframe.focus) {
            this.applyFocusEffects(engine, currentKeyframe.focus, currentKeyframe.effects);
          }

          // Spatial audio cues
          if (currentKeyframe.audio?.spatialSound) {
            this.triggerSpatialAudio(currentKeyframe, engine.getViewport());
          }
        }

        if (progress < 1) {
          requestAnimationFrame(executeKeyframe);
        } else {
          this.activeSequence = null;
          resolve();
        }
      };

      requestAnimationFrame(executeKeyframe);
    });
  }

  /**
   * Generate automatic spatial layout based on narrative flow
   */
  private generateNarrativeLayout(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
    const flowElements = elements.filter(el => 
      flow.connections.some(conn => conn.fromElement === el.id || conn.toElement === el.id)
    );

    // Determine layout pattern based on flow type
    const layoutPattern = this.getLayoutPattern(flow);
    
    switch (layoutPattern) {
      case 'hero-journey':
        return this.generateHeroJourneyLayout(flow, flowElements);
      case 'spiral-story':
        return this.generateSpiralLayout(flow, flowElements);
      case 'timeline':
        return this.generateTimelineLayout(flow, flowElements);
      case 'hub-and-spoke':
        return this.generateHubSpokeLayout(flow, flowElements);
      case 'exploration-grid':
        return this.generateExplorationGrid(flow, flowElements);
      default:
        return this.generateLinearLayout(flow, flowElements);
    }
  }

  private generateHeroJourneyLayout(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
    const layout = new Map();
    const centerX = 5000;
    const centerY = 3000;
    
    // Classic hero's journey: departure → trials → return
    const connections = this.sortConnectionsByNarrative(flow.connections);
    
    connections.forEach((connection, index) => {
      const angle = (index / connections.length) * Math.PI * 2;
      const radius = 1000 + (index * 200); // Expanding spiral
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.7; // Elliptical for cinematic feel
      
      layout.set(connection.toElement, {
        x, y,
        bounds: elements.find(el => el.id === connection.toElement)?.bounds,
        narrativeStage: this.getHeroStage(index, connections.length),
        cinematicAngle: angle,
      });
    });

    return layout;
  }

  private generateSpiralLayout(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
    const layout = new Map();
    const centerX = 4000;
    const centerY = 4000;
    
    flow.connections.forEach((connection, index) => {
      // Golden ratio spiral for pleasing aesthetics
      const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
      const angle = index * goldenAngle;
      const radius = Math.sqrt(index + 1) * 300;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      layout.set(connection.toElement, {
        x, y,
        bounds: elements.find(el => el.id === connection.toElement)?.bounds,
        spiralIndex: index,
        cinematicDepth: radius / 300, // For parallax effects
      });
    });

    return layout;
  }

  private generateTimelineLayout(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
    const layout = new Map();
    const startX = 1000;
    const startY = 2000;
    const spacing = 2000;
    
    flow.connections.forEach((connection, index) => {
      // Cinematic timeline with dramatic spacing
      const x = startX + (index * spacing);
      const y = startY + (Math.sin(index * 0.5) * 500); // Gentle wave for visual interest
      
      layout.set(connection.toElement, {
        x, y,
        bounds: elements.find(el => el.id === connection.toElement)?.bounds,
        timelineIndex: index,
        narrativeAct: Math.floor(index / (flow.connections.length / 3)), // 3-act structure
      });
    });

    return layout;
  }

  private generateHubSpokeLayout(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
    const layout = new Map();
    const centerX = 5000;
    const centerY = 3000;
    const radius = 1500;
    
    // Find the hub element (most connections)
    const connectionCounts = new Map();
    flow.connections.forEach(conn => {
      connectionCounts.set(conn.fromElement, (connectionCounts.get(conn.fromElement) || 0) + 1);
      connectionCounts.set(conn.toElement, (connectionCounts.get(conn.toElement) || 0) + 1);
    });
    
    const hubElement = Array.from(connectionCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    if (hubElement) {
      layout.set(hubElement, {
        x: centerX,
        y: centerY,
        bounds: elements.find(el => el.id === hubElement)?.bounds,
        isHub: true,
      });
    }

    // Arrange spokes around hub
    const spokeElements = flow.connections
      .map(conn => conn.toElement)
      .filter(id => id !== hubElement);
    
    spokeElements.forEach((elementId, index) => {
      const angle = (index / spokeElements.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      layout.set(elementId, {
        x, y,
        bounds: elements.find(el => el.id === elementId)?.bounds,
        spokeIndex: index,
        hubConnection: hubElement,
      });
    });

    return layout;
  }

  private generateExplorationGrid(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
    const layout = new Map();
    const gridSize = Math.ceil(Math.sqrt(flow.connections.length));
    const cellSize = 1500;
    const startX = 2000;
    const startY = 2000;
    
    flow.connections.forEach((connection, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      // Add some organic variation to avoid rigid grid
      const offsetX = (Math.random() - 0.5) * 200;
      const offsetY = (Math.random() - 0.5) * 200;
      
      const x = startX + (col * cellSize) + offsetX;
      const y = startY + (row * cellSize) + offsetY;
      
      layout.set(connection.toElement, {
        x, y,
        bounds: elements.find(el => el.id === connection.toElement)?.bounds,
        gridPosition: { row, col },
        explorationLevel: Math.floor(index / 3), // Group into exploration levels
      });
    });

    return layout;
  }

  private generateLinearLayout(flow: PenpotFlow, elements: SpatialElement[]): Map<string, any> {
    const layout = new Map();
    const startX = 2000;
    const startY = 3000;
    const spacing = 1800;
    
    flow.connections.forEach((connection, index) => {
      const x = startX + (index * spacing);
      const y = startY + (Math.random() - 0.5) * 200; // Slight variation
      
      layout.set(connection.toElement, {
        x, y,
        bounds: elements.find(el => el.id === connection.toElement)?.bounds,
        sequence: index,
      });
    });

    return layout;
  }

  private createCinematicSequence(
    connection: PenpotConnection, 
    elements: SpatialElement[], 
    layout: Map<string, any>
  ): CinematicSequence {
    const fromElement = elements.find(el => el.id === connection.fromElement);
    const toElement = elements.find(el => el.id === connection.toElement);
    
    if (!fromElement || !toElement) {
      return this.createSimpleSequence(connection);
    }

    const movementType = this.getMovementTypeForTransition(connection);
    const movement = this.movements.get(movementType);
    
    if (!movement) {
      return this.createSimpleSequence(connection);
    }

    // Create viewport for movement calculation
    const fromLayout = layout.get(connection.fromElement);
    const toLayout = layout.get(connection.toElement);
    
    const viewport: Viewport = {
      x: fromLayout?.x || fromElement.bounds.x,
      y: fromLayout?.y || fromElement.bounds.y,
      zoom: 1,
      width: 1920,
      height: 1080,
    };

    return movement.calculate(fromElement, toElement, viewport);
  }

  private setupBuiltInMovements(): void {
    // Documentary style: smooth, informative
    this.movements.set('documentary-pan', {
      name: 'Documentary Pan',
      description: 'Smooth, steady movement like a documentary camera',
      calculate: (from, to, viewport) => ({
        keyframes: [
          { timestamp: 0, viewport: { x: from.bounds.x, y: from.bounds.y, zoom: 1.2 } },
          { timestamp: 0.3, viewport: { zoom: 0.8 } }, // Pull back to see context
          { timestamp: 0.7, viewport: { x: to.bounds.x, y: to.bounds.y } }, // Pan to target
          { timestamp: 1, viewport: { zoom: 1.2 } }, // Push in for detail
        ],
        totalDuration: 2000,
        style: 'documentary',
      }),
    });

    // Cinematic reveal: dramatic, engaging
    this.movements.set('cinematic-reveal', {
      name: 'Cinematic Reveal',
      description: 'Dramatic reveal with depth and focus effects',
      calculate: (from, to, viewport) => ({
        keyframes: [
          { 
            timestamp: 0, 
            viewport: { x: from.bounds.x, y: from.bounds.y, zoom: 2 },
            effects: { blur: 0.5, vignette: 0.3 }
          },
          { 
            timestamp: 0.2, 
            viewport: { zoom: 0.5 },
            effects: { blur: 1, vignette: 0.6 }
          },
          { 
            timestamp: 0.5, 
            viewport: { x: to.bounds.x, y: to.bounds.y },
            effects: { blur: 0.8 }
          },
          { 
            timestamp: 0.8, 
            viewport: { zoom: 1.5 },
            effects: { blur: 0.2, spotlight: { x: to.bounds.x, y: to.bounds.y, radius: 300 } }
          },
          { 
            timestamp: 1, 
            viewport: { zoom: 1 },
            effects: { blur: 0, vignette: 0 },
            focus: to.id
          },
        ],
        totalDuration: 3000,
        style: 'cinematic',
      }),
    });

    // Playful bounce: fun, energetic
    this.movements.set('playful-bounce', {
      name: 'Playful Bounce',
      description: 'Bouncy, energetic movement with elastic easing',
      calculate: (from, to, viewport) => ({
        keyframes: [
          { timestamp: 0, viewport: { x: from.bounds.x, y: from.bounds.y, zoom: 1 } },
          { timestamp: 0.3, viewport: { zoom: 0.7 } }, // Bounce back
          { timestamp: 0.6, viewport: { x: to.bounds.x, y: to.bounds.y, zoom: 1.3 } }, // Bounce forward
          { timestamp: 1, viewport: { zoom: 1 } }, // Settle
        ],
        totalDuration: 1200,
        style: 'playful',
      }),
    });

    // Professional focus: clean, efficient
    this.movements.set('professional-focus', {
      name: 'Professional Focus',
      description: 'Clean, efficient transition with subtle highlighting',
      calculate: (from, to, viewport) => ({
        keyframes: [
          { timestamp: 0, viewport: { x: from.bounds.x, y: from.bounds.y, zoom: 1 } },
          { timestamp: 0.4, viewport: { x: to.bounds.x, y: to.bounds.y } },
          { timestamp: 1, viewport: { zoom: 1 }, focus: to.id },
        ],
        totalDuration: 800,
        style: 'professional',
      }),
    });

    // Dramatic zoom: intense, focused
    this.movements.set('dramatic-zoom', {
      name: 'Dramatic Zoom',
      description: 'Intense zoom with dramatic timing',
      calculate: (from, to, viewport) => ({
        keyframes: [
          { 
            timestamp: 0, 
            viewport: { x: from.bounds.x, y: from.bounds.y, zoom: 0.3 },
            effects: { vignette: 0.8 }
          },
          { 
            timestamp: 0.6, 
            viewport: { x: to.bounds.x, y: to.bounds.y, zoom: 0.5 }
          },
          { 
            timestamp: 1, 
            viewport: { zoom: 2 },
            effects: { vignette: 0, spotlight: { x: to.bounds.x, y: to.bounds.y, radius: 400 } },
            focus: to.id
          },
        ],
        totalDuration: 2500,
        style: 'dramatic',
      }),
    });
  }

  private getLayoutPattern(flow: PenpotFlow): string {
    const connectionCount = flow.connections.length;
    const metadata = flow.metadata;

    // Use metadata hints if available
    if (metadata?.storyboard) return 'hero-journey';
    if (metadata?.presentation) return 'timeline';
    if (metadata?.userJourney) return 'hub-and-spoke';

    // Infer from connection structure
    if (connectionCount <= 3) return 'linear';
    if (connectionCount <= 8) return 'spiral-story';
    if (connectionCount <= 15) return 'hub-and-spoke';
    return 'exploration-grid';
  }

  private getMovementTypeForTransition(connection: PenpotConnection): string {
    const emotion = connection.metadata?.emotion;
    const storytelling = connection.metadata?.storytelling;

    // Map emotions to movement styles
    if (emotion === 'dramatic') return 'dramatic-zoom';
    if (emotion === 'playful') return 'playful-bounce';
    if (emotion === 'professional') return 'professional-focus';
    if (emotion === 'calm') return 'documentary-pan';

    // Map storytelling to movement styles
    if (storytelling === 'reveal') return 'cinematic-reveal';
    if (storytelling === 'focus') return 'dramatic-zoom';
    if (storytelling === 'journey') return 'documentary-pan';

    // Default based on transition type
    switch (connection.transitionType) {
      case 'zoom': return 'dramatic-zoom';
      case 'slide': return 'documentary-pan';
      case 'dissolve': return 'cinematic-reveal';
      default: return 'professional-focus';
    }
  }

  private sortConnectionsByNarrative(connections: PenpotConnection[]): PenpotConnection[] {
    // Sort connections to follow narrative structure
    return connections.sort((a, b) => {
      const aStory = a.metadata?.storytelling || 'sequence';
      const bStory = b.metadata?.storytelling || 'sequence';
      
      const storyOrder = ['sequence', 'reveal', 'focus', 'journey', 'comparison'];
      return storyOrder.indexOf(aStory) - storyOrder.indexOf(bStory);
    });
  }

  private getHeroStage(index: number, total: number): string {
    const progress = index / total;
    if (progress < 0.3) return 'departure';
    if (progress < 0.7) return 'trials';
    return 'return';
  }

  private getCurrentKeyframe(sequence: CinematicSequence, progress: number): CinematicKeyframe | null {
    // Find the appropriate keyframe for current progress
    for (let i = 0; i < sequence.keyframes.length - 1; i++) {
      const current = sequence.keyframes[i];
      const next = sequence.keyframes[i + 1];
      
      if (progress >= current.timestamp && progress <= next.timestamp) {
        // Interpolate between current and next keyframe
        const localProgress = (progress - current.timestamp) / (next.timestamp - current.timestamp);
        return this.interpolateKeyframes(current, next, localProgress);
      }
    }
    
    return sequence.keyframes[sequence.keyframes.length - 1];
  }

  private interpolateKeyframes(from: CinematicKeyframe, to: CinematicKeyframe, progress: number): CinematicKeyframe {
    // Use cinematic easing for smooth interpolation between keyframes
    const positionEasing = CinematicEasingLibrary.getEasing('documentary-smooth');
    const zoomEasing = CinematicEasingLibrary.getEasing('dramatic-zoom');
    
    const viewport: Partial<Viewport> = {};
    
    if (from.viewport.x !== undefined && to.viewport.x !== undefined) {
      viewport.x = from.viewport.x + (to.viewport.x - from.viewport.x) * positionEasing(progress);
    }
    
    if (from.viewport.y !== undefined && to.viewport.y !== undefined) {
      viewport.y = from.viewport.y + (to.viewport.y - from.viewport.y) * positionEasing(progress);
    }
    
    if (from.viewport.zoom !== undefined && to.viewport.zoom !== undefined) {
      viewport.zoom = from.viewport.zoom + (to.viewport.zoom - from.viewport.zoom) * zoomEasing(progress);
    }

    return {
      timestamp: progress,
      viewport,
      focus: progress > 0.5 ? to.focus : from.focus,
      effects: this.interpolateEffects(from.effects, to.effects, progress),
    };
  }

  private interpolateEffects(from?: any, to?: any, progress: number = 0): any {
    if (!from && !to) return undefined;
    if (!from) return to;
    if (!to) return from;
    
    const effects: any = {};
    
    if (from.blur !== undefined || to.blur !== undefined) {
      const fromBlur = from.blur || 0;
      const toBlur = to.blur || 0;
      effects.blur = fromBlur + (toBlur - fromBlur) * progress;
    }

    return effects;
  }

  private applyCinematicEffects(engine: any, effects: any): void {
    // Apply visual effects to the spatial engine
    if (effects.blur) {
      engine.setRenderEffect('blur', effects.blur);
    }
    
    if (effects.vignette) {
      engine.setRenderEffect('vignette', effects.vignette);
    }
    
    if (effects.spotlight) {
      engine.setRenderEffect('spotlight', effects.spotlight);
    }
  }

  private applyFocusEffects(engine: any, elementId: string, effects?: any): void {
    // Highlight focused element
    engine.highlightElement(elementId, {
      intensity: 1.2,
      duration: 500,
      style: 'cinematic',
    });
  }

  private triggerSpatialAudio(keyframe: CinematicKeyframe, viewport: Viewport): void {
    // Spatial audio cues for accessibility and immersion
    if (keyframe.audio?.spatialSound && this.spatialAudio) {
      this.spatialAudio.updateListener(viewport);
      
      // Play appropriate audio cue based on keyframe context
      if (keyframe.focus) {
        this.spatialAudio.playCue('focus-element', {
          x: viewport.x,
          y: viewport.y,
        });
      }
      
      // Add doppler effect if enabled
      if (keyframe.audio.doppler && keyframe.viewport.x !== undefined && keyframe.viewport.y !== undefined) {
        // Calculate movement direction for doppler effect
        const fromPosition = { x: viewport.x, y: viewport.y };
        const toPosition = { x: keyframe.viewport.x, y: keyframe.viewport.y };
        
        this.spatialAudio.playTransition(fromPosition, toPosition, 500, 'slide');
      }
    }
  }

  private createSimpleSequence(connection: PenpotConnection): CinematicSequence {
    return {
      keyframes: [
        { timestamp: 0, viewport: {} },
        { timestamp: 1, viewport: {} },
      ],
      totalDuration: 1000,
      style: 'professional',
    };
  }

  private getSequence(connectionId: string): CinematicSequence | null {
    // This would be stored when choreographing flows
    return this.activeSequence;
  }
}