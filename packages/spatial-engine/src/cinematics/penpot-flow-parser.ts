/**
 * Parser for extracting Penpot flows and converting them to cinematic sequences
 * Parses .penpot files to extract flow connections and metadata for spatial choreography
 */

import type { PenpotFile, PenpotPage, PenpotElement, Interaction } from '@fir/penpot-parser';
import type { PenpotFlow, PenpotConnection } from './flow-choreographer.js';

// Re-export types
export type { PenpotFlow, PenpotConnection };

export interface FlowExtractionResult {
  flows: PenpotFlow[];
  connections: PenpotConnection[];
  flowStats: {
    totalFlows: number;
    totalConnections: number;
    triggerTypes: Record<string, number>;
    emotionalTones: Record<string, number>;
    narrativePatterns: Record<string, number>;
  };
}

export class PenpotFlowParser {
  /**
   * Extract flows from a parsed Penpot file
   */
  extractFlows(penpotFile: PenpotFile): FlowExtractionResult {
    const flows: PenpotFlow[] = [];
    const allConnections: PenpotConnection[] = [];
    const stats = this.initializeStats();

    for (const page of penpotFile.pages) {
      const pageFlows = this.extractFlowsFromPage(page);
      flows.push(...pageFlows);
      
      for (const flow of pageFlows) {
        allConnections.push(...flow.connections);
        this.updateStats(stats, flow);
      }
    }

    return {
      flows,
      connections: allConnections,
      flowStats: this.finalizeStats(stats),
    };
  }

  /**
   * Extract flows from a single page
   */
  private extractFlowsFromPage(page: PenpotPage): PenpotFlow[] {
    const elementsWithInteractions = this.findElementsWithInteractions(page.elements);
    
    if (elementsWithInteractions.length === 0) {
      return [];
    }

    // Group interactions into coherent flows
    const flowGroups = this.groupInteractionsIntoFlows(elementsWithInteractions, page);
    
    return flowGroups.map(group => this.createFlowFromGroup(group, page));
  }

  /**
   * Find elements that have interactions
   */
  private findElementsWithInteractions(elements: PenpotElement[]): Array<{ element: PenpotElement; interactions: Interaction[] }> {
    const result: Array<{ element: PenpotElement; interactions: Interaction[] }> = [];

    for (const element of elements) {
      if (element.interactions && element.interactions.length > 0) {
        result.push({ element, interactions: element.interactions });
      }

      // Recursively check children
      if (element.children) {
        result.push(...this.findElementsWithInteractions(element.children));
      }
    }

    return result;
  }

  /**
   * Group interactions into coherent flows based on connection patterns
   */
  private groupInteractionsIntoFlows(
    elementsWithInteractions: Array<{ element: PenpotElement; interactions: Interaction[] }>,
    page: PenpotPage
  ): Array<Array<{ element: PenpotElement; interactions: Interaction[] }>> {
    const flows: Array<Array<{ element: PenpotElement; interactions: Interaction[] }>> = [];
    const processed = new Set<string>();

    for (const item of elementsWithInteractions) {
      if (processed.has(item.element.id)) continue;

      const flow = this.traceFlow(item, elementsWithInteractions, processed);
      if (flow.length > 0) {
        flows.push(flow);
      }
    }

    return flows;
  }

  /**
   * Trace a flow starting from a given element
   */
  private traceFlow(
    startItem: { element: PenpotElement; interactions: Interaction[] },
    allItems: Array<{ element: PenpotElement; interactions: Interaction[] }>,
    processed: Set<string>
  ): Array<{ element: PenpotElement; interactions: Interaction[] }> {
    const flow: Array<{ element: PenpotElement; interactions: Interaction[] }> = [];
    const queue = [startItem];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.element.id)) continue;
      
      visited.add(current.element.id);
      processed.add(current.element.id);
      flow.push(current);

      // Find next elements in the flow
      for (const interaction of current.interactions) {
        if (interaction.target && interaction.action.type === 'navigate') {
          const nextItem = allItems.find(item => item.element.id === interaction.target);
          if (nextItem && !visited.has(nextItem.element.id)) {
            queue.push(nextItem);
          }
        }
      }
    }

    return flow;
  }

  /**
   * Create a PenpotFlow from a group of connected elements
   */
  private createFlowFromGroup(
    group: Array<{ element: PenpotElement; interactions: Interaction[] }>,
    page: PenpotPage
  ): PenpotFlow {
    const connections: PenpotConnection[] = [];
    
    // Create connections from interactions
    for (const item of group) {
      for (const interaction of item.interactions) {
        if (interaction.target && interaction.action.type === 'navigate') {
          connections.push(this.createConnectionFromInteraction(item.element, interaction));
        }
      }
    }

    // Determine flow metadata from element names and patterns
    const metadata = this.analyzeFlowMetadata(group, connections);

    return {
      id: `flow-${page.id}-${group[0].element.id}`,
      name: this.generateFlowName(group, page),
      startingPoint: group[0].element.id,
      connections,
      metadata,
    };
  }

  /**
   * Create a PenpotConnection from a Penpot interaction
   */
  private createConnectionFromInteraction(element: PenpotElement, interaction: Interaction): PenpotConnection {
    return {
      id: `connection-${element.id}-${interaction.target}`,
      fromElement: element.id,
      toElement: interaction.target!,
      trigger: this.mapTriggerType(interaction.trigger),
      transitionType: this.inferTransitionType(element, interaction),
      duration: this.inferDuration(interaction),
      easing: this.inferEasing(interaction),
      metadata: this.analyzeConnectionMetadata(element, interaction),
    };
  }

  /**
   * Map Penpot trigger types to PenpotConnection trigger types
   */
  private mapTriggerType(trigger: string): PenpotConnection['trigger'] {
    switch (trigger) {
      case 'click': return 'click';
      case 'hover': return 'hover';
      case 'submit': return 'auto';
      case 'change': return 'scroll';
      default: return 'custom';
    }
  }

  /**
   * Infer transition type from element properties and interaction
   */
  private inferTransitionType(element: PenpotElement, interaction: Interaction): PenpotConnection['transitionType'] {
    // Analyze element name for transition hints
    const elementName = element.name.toLowerCase();
    
    if (elementName.includes('slide')) return 'slide';
    if (elementName.includes('zoom')) return 'zoom';
    if (elementName.includes('flip')) return 'flip';
    if (elementName.includes('fade') || elementName.includes('dissolve')) return 'dissolve';
    if (elementName.includes('push')) return 'push';
    if (elementName.includes('cover')) return 'cover';
    
    // Default based on interaction parameters
    if (interaction.parameters?.transition) {
      return interaction.parameters.transition as PenpotConnection['transitionType'];
    }
    
    return 'slide'; // Default
  }

  /**
   * Infer transition duration from interaction parameters
   */
  private inferDuration(interaction: Interaction): number {
    if (interaction.parameters?.duration) {
      return Number(interaction.parameters.duration) || 1000;
    }
    
    // Default durations based on interaction type
    switch (interaction.action.type) {
      case 'navigate': return 800;
      case 'external-link': return 300;
      default: return 500;
    }
  }

  /**
   * Infer easing function from interaction parameters
   */
  private inferEasing(interaction: Interaction): string {
    if (interaction.parameters?.easing) {
      return interaction.parameters.easing as string;
    }
    
    return 'ease-in-out'; // Default
  }

  /**
   * Analyze connection metadata for emotional and storytelling context
   */
  private analyzeConnectionMetadata(element: PenpotElement, interaction: Interaction): PenpotConnection['metadata'] {
    const elementName = element.name.toLowerCase();
    const metadata: PenpotConnection['metadata'] = {};

    // Detect emotion from element naming
    if (elementName.includes('dramatic') || elementName.includes('bold')) {
      metadata.emotion = 'dramatic';
    } else if (elementName.includes('playful') || elementName.includes('fun')) {
      metadata.emotion = 'playful';
    } else if (elementName.includes('calm') || elementName.includes('subtle')) {
      metadata.emotion = 'calm';
    } else if (elementName.includes('exciting') || elementName.includes('energetic')) {
      metadata.emotion = 'excitement';
    } else {
      metadata.emotion = 'professional';
    }

    // Detect storytelling patterns
    if (elementName.includes('reveal') || elementName.includes('show')) {
      metadata.storytelling = 'reveal';
    } else if (elementName.includes('focus') || elementName.includes('highlight')) {
      metadata.storytelling = 'focus';
    } else if (elementName.includes('journey') || elementName.includes('path')) {
      metadata.storytelling = 'journey';
    } else if (elementName.includes('compare') || elementName.includes('vs')) {
      metadata.storytelling = 'comparison';
    } else {
      metadata.storytelling = 'sequence';
    }

    // Add narrative description from interaction parameters
    if (interaction.parameters?.narrative) {
      metadata.narrative = interaction.parameters.narrative as string;
    }

    return metadata;
  }

  /**
   * Analyze flow metadata to determine layout and presentation patterns
   */
  private analyzeFlowMetadata(
    group: Array<{ element: PenpotElement; interactions: Interaction[] }>,
    connections: PenpotConnection[]
  ): PenpotFlow['metadata'] {
    const allNames = group.map(item => item.element.name.toLowerCase()).join(' ');
    const metadata: PenpotFlow['metadata'] = {};

    // Detect flow type from element names
    if (allNames.includes('storyboard') || allNames.includes('story')) {
      metadata.storyboard = true;
    }
    
    if (allNames.includes('presentation') || allNames.includes('slides')) {
      metadata.presentation = true;
    }
    
    if (allNames.includes('journey') || allNames.includes('user flow')) {
      metadata.userJourney = true;
    }

    // Infer from connection patterns
    if (connections.length > 5 && connections.some(c => c.metadata?.storytelling === 'journey')) {
      metadata.userJourney = true;
    }
    
    if (connections.every(c => c.trigger === 'auto' || c.trigger === 'time')) {
      metadata.presentation = true;
    }

    return metadata;
  }

  /**
   * Generate a descriptive name for the flow
   */
  private generateFlowName(
    group: Array<{ element: PenpotElement; interactions: Interaction[] }>,
    page: PenpotPage
  ): string {
    const startElementName = group[0].element.name;
    const connectionCount = group.reduce((sum, item) => sum + item.interactions.length, 0);
    
    // Try to create a meaningful name
    const baseName = startElementName.includes('flow') || startElementName.includes('Flow') 
      ? startElementName 
      : `${startElementName} Flow`;
    
    return `${baseName} (${connectionCount} connections)`;
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStats(): any {
    return {
      totalFlows: 0,
      totalConnections: 0,
      triggerTypes: {} as Record<string, number>,
      emotionalTones: {} as Record<string, number>,
      narrativePatterns: {} as Record<string, number>,
    };
  }

  /**
   * Update statistics with flow data
   */
  private updateStats(stats: any, flow: PenpotFlow): void {
    stats.totalFlows++;
    
    for (const connection of flow.connections) {
      stats.totalConnections++;
      
      // Track trigger types
      stats.triggerTypes[connection.trigger] = (stats.triggerTypes[connection.trigger] || 0) + 1;
      
      // Track emotional tones
      if (connection.metadata?.emotion) {
        stats.emotionalTones[connection.metadata.emotion] = 
          (stats.emotionalTones[connection.metadata.emotion] || 0) + 1;
      }
      
      // Track narrative patterns
      if (connection.metadata?.storytelling) {
        stats.narrativePatterns[connection.metadata.storytelling] = 
          (stats.narrativePatterns[connection.metadata.storytelling] || 0) + 1;
      }
    }
  }

  /**
   * Finalize statistics
   */
  private finalizeStats(stats: any): FlowExtractionResult['flowStats'] {
    return {
      totalFlows: stats.totalFlows,
      totalConnections: stats.totalConnections,
      triggerTypes: stats.triggerTypes,
      emotionalTones: stats.emotionalTones,
      narrativePatterns: stats.narrativePatterns,
    };
  }
}