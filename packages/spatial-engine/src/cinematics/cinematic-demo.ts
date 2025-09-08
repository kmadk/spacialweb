/**
 * Comprehensive demo showcasing cinematic movement capabilities
 * Demonstrates all narrative layouts and movement styles with example Penpot flows
 */

import type { SpatialElement, SpatialWorld } from '../types.js';
import { OptimizedSpatialEngine } from '../optimized-spatial-engine.js';
import { FlowChoreographer, type PenpotFlow, type PenpotConnection } from './flow-choreographer.js';
import { PenpotFlowParser } from './penpot-flow-parser.js';

export interface CinematicDemoOptions {
  container: HTMLElement;
  autoPlay?: boolean;
  showControls?: boolean;
  demoSpeed?: 'slow' | 'normal' | 'fast';
  narrativeVoice?: boolean;
}

export interface DemoScenario {
  name: string;
  description: string;
  flows: PenpotFlow[];
  elements: SpatialElement[];
  recommendedLayout: string;
}

export class CinematicDemo {
  private engine: OptimizedSpatialEngine;
  private choreographer: FlowChoreographer;
  private parser: PenpotFlowParser;
  private currentScenario: DemoScenario | null = null;
  private isPlaying = false;

  constructor(options: CinematicDemoOptions) {
    this.engine = new OptimizedSpatialEngine(options.container, {
      initialViewport: {
        x: 0,
        y: 0,
        zoom: 1,
        width: options.container.clientWidth,
        height: options.container.clientHeight,
      },
    });

    this.choreographer = new FlowChoreographer();
    this.parser = new PenpotFlowParser();

    if (options.showControls) {
      this.createDemoControls(options.container);
    }
  }

  /**
   * Get all available demo scenarios
   */
  getAvailableScenarios(): DemoScenario[] {
    return [
      this.createHeroJourneyScenario(),
      this.createSpiralStoryScenario(),
      this.createTimelineScenario(),
      this.createHubSpokeScenario(),
      this.createExplorationScenario(),
      this.createPresentationScenario(),
      this.createUserJourneyScenario(),
    ];
  }

  /**
   * Load and run a specific demo scenario
   */
  async runScenario(scenarioName: string, options: { autoPlay?: boolean; narrativeVoice?: boolean } = {}): Promise<void> {
    const scenario = this.getAvailableScenarios().find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Demo scenario '${scenarioName}' not found`);
    }

    this.currentScenario = scenario;

    // Create spatial world from scenario elements
    const world: SpatialWorld = {
      bounds: this.calculateWorldBounds(scenario.elements),
      elements: scenario.elements,
    };

    // Load world into engine
    this.engine.loadWorld(world);

    // Choreograph flows
    this.engine.choreographFlows(scenario.flows);

    console.log(`🎬 Loaded scenario: ${scenario.name}`);
    console.log(`📊 Elements: ${scenario.elements.length}, Flows: ${scenario.flows.length}`);
    console.log(`🎭 Layout: ${scenario.recommendedLayout}`);
    console.log(`📝 ${scenario.description}`);

    if (options.autoPlay) {
      await this.playAllConnections(options.narrativeVoice);
    }
  }

  /**
   * Play all connections in the current scenario
   */
  async playAllConnections(narrativeVoice = false): Promise<void> {
    if (!this.currentScenario) {
      throw new Error('No scenario loaded');
    }

    this.isPlaying = true;
    const connections = this.engine.getCinematicConnections();

    console.log(`🎬 Playing ${connections.size} cinematic transitions...`);

    for (const [connectionId, sequence] of connections) {
      if (!this.isPlaying) break;

      console.log(`🎭 Executing: ${connectionId} (${sequence.style} style, ${sequence.totalDuration}ms)`);
      
      await this.engine.executeCinematicTransition(connectionId, {
        narrativeVoice,
        fastMode: false,
      });

      // Pause between transitions for effect
      await this.delay(800);
    }

    this.isPlaying = false;
    console.log('🎬 Demo sequence completed');
  }

  /**
   * Demonstrate specific movement types
   */
  async demonstrateMovementTypes(): Promise<void> {
    console.log('🎭 Demonstrating all cinematic movement types...');

    const movementTypes = [
      'documentary-pan',
      'cinematic-reveal',
      'playful-bounce',
      'professional-focus',
      'dramatic-zoom',
    ];

    for (const movementType of movementTypes) {
      console.log(`🎬 Demonstrating: ${movementType}`);
      
      // Create sample flow for this movement type
      const sampleFlow = this.createMovementDemoFlow(movementType);
      const world = this.createSampleWorld();
      
      this.engine.loadWorld(world);
      this.engine.choreographFlows([sampleFlow]);
      
      const connections = this.engine.getCinematicConnections();
      const firstConnection = connections.keys().next().value;
      
      if (firstConnection) {
        await this.engine.executeCinematicTransition(firstConnection);
        await this.delay(1000);
      }
    }

    console.log('🎭 Movement type demonstration completed');
  }

  /**
   * Show performance metrics during cinematic playback
   */
  showPerformanceMetrics(): void {
    const metrics = this.engine.getPerformanceMetrics();
    
    console.log('📊 Cinematic Performance Metrics:');
    console.log(`   Frame Rate: ${metrics.rendering.frameRate.toFixed(1)} fps`);
    console.log(`   Frame Time: ${metrics.rendering.frameTime.toFixed(1)} ms`);
    console.log(`   Memory Usage: ${(metrics.memory.jsHeapSize / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`   Transition Time: ${metrics.interactions.transitionTime.toFixed(1)} ms`);
    console.log(`   Elements Rendered: ${metrics.rendering.culledElements || 'N/A'}`);
  }

  /**
   * Export current scenario as JSON for debugging
   */
  exportCurrentScenario(): any {
    if (!this.currentScenario) return null;

    return {
      scenario: this.currentScenario,
      spatialLayout: Object.fromEntries(this.engine.getSpatialLayout()),
      cinematicConnections: Object.fromEntries(
        Array.from(this.engine.getCinematicConnections()).map(([id, sequence]) => [
          id,
          {
            keyframeCount: sequence.keyframes.length,
            totalDuration: sequence.totalDuration,
            style: sequence.style,
          },
        ])
      ),
    };
  }

  /**
   * Stop current demo playback
   */
  stop(): void {
    this.isPlaying = false;
  }

  /**
   * Create hero journey demo scenario
   */
  private createHeroJourneyScenario(): DemoScenario {
    const elements = this.createStoryElements([
      'Hero Home',
      'Call to Adventure',
      'Mentor Appears',
      'Cross Threshold',
      'Tests and Trials',
      'Final Battle',
      'Return Home',
    ]);

    const flows: PenpotFlow[] = [{
      id: 'hero-journey-flow',
      name: 'Hero\'s Journey',
      startingPoint: elements[0].id,
      connections: this.createLinearConnections(elements, 'dramatic'),
      metadata: { storyboard: true },
    }];

    return {
      name: 'Hero Journey',
      description: 'Classic hero\'s journey with expanding spiral layout and dramatic transitions',
      flows,
      elements,
      recommendedLayout: 'hero-journey',
    };
  }

  /**
   * Create spiral story demo scenario
   */
  private createSpiralStoryScenario(): DemoScenario {
    const elements = this.createStoryElements([
      'Introduction',
      'Rising Action',
      'Complication',
      'Development',
      'Climax',
      'Resolution',
    ]);

    const flows: PenpotFlow[] = [{
      id: 'spiral-story-flow',
      name: 'Spiral Narrative',
      startingPoint: elements[0].id,
      connections: this.createLinearConnections(elements, 'cinematic'),
      metadata: { storyboard: true },
    }];

    return {
      name: 'Spiral Story',
      description: 'Golden ratio spiral layout with cinematic reveal transitions',
      flows,
      elements,
      recommendedLayout: 'spiral-story',
    };
  }

  /**
   * Create timeline demo scenario
   */
  private createTimelineScenario(): DemoScenario {
    const elements = this.createStoryElements([
      '2020: Genesis',
      '2021: Growth',
      '2022: Expansion',
      '2023: Innovation',
      '2024: Future',
    ]);

    const flows: PenpotFlow[] = [{
      id: 'timeline-flow',
      name: 'Timeline Presentation',
      startingPoint: elements[0].id,
      connections: this.createLinearConnections(elements, 'professional'),
      metadata: { presentation: true },
    }];

    return {
      name: 'Timeline',
      description: 'Linear timeline with professional focus transitions',
      flows,
      elements,
      recommendedLayout: 'timeline',
    };
  }

  /**
   * Create hub and spoke demo scenario
   */
  private createHubSpokeScenario(): DemoScenario {
    const hubElement = this.createElement('Central Hub', 0, 0, 200, 100);
    const spokeElements = this.createStoryElements([
      'Feature A',
      'Feature B',
      'Feature C',
      'Feature D',
      'Feature E',
    ]);

    const elements = [hubElement, ...spokeElements];

    // Create connections from hub to all spokes
    const connections: PenpotConnection[] = spokeElements.map((spoke, index) => ({
      id: `hub-to-${spoke.id}`,
      fromElement: hubElement.id,
      toElement: spoke.id,
      trigger: 'click',
      transitionType: 'zoom',
      metadata: { emotion: 'professional', storytelling: 'focus' },
    }));

    const flows: PenpotFlow[] = [{
      id: 'hub-spoke-flow',
      name: 'Hub and Spoke Navigation',
      startingPoint: hubElement.id,
      connections,
      metadata: { userJourney: true },
    }];

    return {
      name: 'Hub and Spoke',
      description: 'Central hub with radial navigation to feature areas',
      flows,
      elements,
      recommendedLayout: 'hub-and-spoke',
    };
  }

  /**
   * Create exploration grid demo scenario
   */
  private createExplorationScenario(): DemoScenario {
    const elements = this.createStoryElements([
      'Gallery Item 1',
      'Gallery Item 2',
      'Gallery Item 3',
      'Gallery Item 4',
      'Gallery Item 5',
      'Gallery Item 6',
    ]);

    const flows: PenpotFlow[] = [{
      id: 'exploration-flow',
      name: 'Gallery Exploration',
      startingPoint: elements[0].id,
      connections: this.createGridConnections(elements),
      metadata: { userJourney: true },
    }];

    return {
      name: 'Exploration Grid',
      description: 'Grid-based exploration with playful bounce transitions',
      flows,
      elements,
      recommendedLayout: 'exploration-grid',
    };
  }

  /**
   * Create presentation demo scenario
   */
  private createPresentationScenario(): DemoScenario {
    const elements = this.createStoryElements([
      'Title Slide',
      'Agenda',
      'Problem Statement',
      'Solution Overview',
      'Implementation',
      'Results',
      'Q&A',
    ]);

    const flows: PenpotFlow[] = [{
      id: 'presentation-flow',
      name: 'Presentation Slides',
      startingPoint: elements[0].id,
      connections: this.createLinearConnections(elements, 'professional'),
      metadata: { presentation: true },
    }];

    return {
      name: 'Presentation',
      description: 'Linear presentation flow with professional transitions',
      flows,
      elements,
      recommendedLayout: 'timeline',
    };
  }

  /**
   * Create user journey demo scenario
   */
  private createUserJourneyScenario(): DemoScenario {
    const elements = this.createStoryElements([
      'Landing Page',
      'Sign Up',
      'Onboarding',
      'Main Dashboard',
      'Feature Discovery',
      'Success State',
    ]);

    const flows: PenpotFlow[] = [{
      id: 'user-journey-flow',
      name: 'User Journey',
      startingPoint: elements[0].id,
      connections: this.createLinearConnections(elements, 'calm'),
      metadata: { userJourney: true },
    }];

    return {
      name: 'User Journey',
      description: 'User onboarding flow with calm documentary-style transitions',
      flows,
      elements,
      recommendedLayout: 'hero-journey',
    };
  }

  /**
   * Helper methods for creating demo elements
   */
  private createStoryElements(names: string[]): SpatialElement[] {
    return names.map((name, index) => 
      this.createElement(name, index * 300, index * 200, 250, 150)
    );
  }

  private createElement(name: string, x: number, y: number, width: number, height: number): SpatialElement {
    return {
      id: `element-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type: 'rectangle' as const,
      bounds: { x, y, width, height },
      styles: {
        fill: { type: 'solid', color: this.getRandomColor() },
        stroke: { color: '#333333', width: 2 },
      },
      data: { content: name },
    };
  }

  private createLinearConnections(elements: SpatialElement[], emotion: string): PenpotConnection[] {
    const connections: PenpotConnection[] = [];
    
    for (let i = 0; i < elements.length - 1; i++) {
      connections.push({
        id: `connection-${i}`,
        fromElement: elements[i].id,
        toElement: elements[i + 1].id,
        trigger: 'click',
        transitionType: 'slide',
        metadata: { 
          emotion: emotion as any, 
          storytelling: 'sequence' as any,
        },
      });
    }
    
    return connections;
  }

  private createGridConnections(elements: SpatialElement[]): PenpotConnection[] {
    const connections: PenpotConnection[] = [];
    
    // Create random connections between elements
    for (let i = 0; i < elements.length; i++) {
      const targetIndex = (i + 1) % elements.length;
      connections.push({
        id: `grid-connection-${i}`,
        fromElement: elements[i].id,
        toElement: elements[targetIndex].id,
        trigger: 'click',
        transitionType: 'zoom',
        metadata: { 
          emotion: 'playful', 
          storytelling: 'focus',
        },
      });
    }
    
    return connections;
  }

  private createMovementDemoFlow(movementType: string): PenpotFlow {
    const elements = this.createStoryElements(['Start', 'End']);
    
    return {
      id: `demo-${movementType}`,
      name: `${movementType} Demo`,
      startingPoint: elements[0].id,
      connections: [{
        id: 'demo-connection',
        fromElement: elements[0].id,
        toElement: elements[1].id,
        trigger: 'click',
        transitionType: 'custom',
        metadata: { 
          emotion: this.getEmotionForMovement(movementType),
          storytelling: 'reveal' as any,
        },
      }],
    };
  }

  private createSampleWorld(): SpatialWorld {
    const elements = this.createStoryElements(['Sample A', 'Sample B']);
    return {
      bounds: this.calculateWorldBounds(elements),
      elements,
    };
  }

  private getEmotionForMovement(movementType: string): any {
    const emotionMap: Record<string, any> = {
      'documentary-pan': 'calm',
      'cinematic-reveal': 'dramatic',
      'playful-bounce': 'playful',
      'professional-focus': 'professional',
      'dramatic-zoom': 'dramatic',
    };
    return emotionMap[movementType] || 'professional';
  }

  private calculateWorldBounds(elements: SpatialElement[]): any {
    if (elements.length === 0) return { x: 0, y: 0, width: 1000, height: 1000 };

    let minX = elements[0].bounds.x;
    let minY = elements[0].bounds.y;
    let maxX = elements[0].bounds.x + elements[0].bounds.width;
    let maxY = elements[0].bounds.y + elements[0].bounds.height;

    for (const element of elements) {
      minX = Math.min(minX, element.bounds.x);
      minY = Math.min(minY, element.bounds.y);
      maxX = Math.max(maxX, element.bounds.x + element.bounds.width);
      maxY = Math.max(maxY, element.bounds.y + element.bounds.height);
    }

    return {
      x: minX - 100,
      y: minY - 100,
      width: maxX - minX + 200,
      height: maxY - minY + 200,
    };
  }

  private getRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private createDemoControls(container: HTMLElement): void {
    const controls = document.createElement('div');
    controls.style.position = 'absolute';
    controls.style.top = '10px';
    controls.style.right = '10px';
    controls.style.background = 'rgba(0,0,0,0.8)';
    controls.style.color = 'white';
    controls.style.padding = '10px';
    controls.style.borderRadius = '5px';
    controls.style.zIndex = '1000';
    
    controls.innerHTML = `
      <div>🎬 Cinematic Demo Controls</div>
      <button id="play-all">Play All</button>
      <button id="show-metrics">Show Metrics</button>
      <button id="stop-demo">Stop</button>
    `;
    
    container.appendChild(controls);

    // Add event listeners
    controls.querySelector('#play-all')?.addEventListener('click', () => {
      this.playAllConnections(true);
    });
    
    controls.querySelector('#show-metrics')?.addEventListener('click', () => {
      this.showPerformanceMetrics();
    });
    
    controls.querySelector('#stop-demo')?.addEventListener('click', () => {
      this.stop();
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}