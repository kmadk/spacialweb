/**
 * Spatial audio integration for immersive cinematic experiences
 * Provides 3D positional audio cues during spatial navigation
 */

export interface SpatialAudioOptions {
  enableDoppler?: boolean;
  enableReverb?: boolean;
  enableDirectionality?: boolean;
  masterVolume?: number;
  spatialRange?: number;
}

export interface AudioCue {
  id: string;
  type: 'transition' | 'focus' | 'ambient' | 'ui' | 'narrative';
  url?: string;
  buffer?: AudioBuffer;
  loop?: boolean;
  volume?: number;
  position?: { x: number; y: number; z?: number };
  spatialProperties?: {
    distanceModel?: DistanceModelType;
    panningModel?: PanningModelType;
    rolloffFactor?: number;
    maxDistance?: number;
  };
}

export interface SpatialAudioState {
  listener: { x: number; y: number; z: number; zoom: number };
  activeSources: Map<string, AudioBufferSourceNode>;
  spatialNodes: Map<string, PannerNode>;
}

export class SpatialAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private listener: AudioListener | null = null;
  private reverbNode: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  private options: Required<SpatialAudioOptions>;
  private state: SpatialAudioState;
  private audioBuffers = new Map<string, AudioBuffer>();
  private isInitialized = false;

  // Predefined audio cues
  private readonly defaultCues: Record<string, Partial<AudioCue>> = {
    'pan-start': {
      type: 'transition',
      url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUcBSuAy/HCdSMFNYTD79qLMAsSUqnp6qFTFQlJp9/tqVUTCklsxOzhkzELEC1//wA=',
    },
    'zoom-in': {
      type: 'transition',
      spatialProperties: {
        distanceModel: 'exponential',
        rolloffFactor: 2,
      },
    },
    'focus-element': {
      type: 'focus',
      volume: 0.3,
    },
    'ambient-space': {
      type: 'ambient',
      loop: true,
      volume: 0.1,
    },
    'narrative-voice': {
      type: 'narrative',
      volume: 0.7,
      spatialProperties: {
        distanceModel: 'linear',
        maxDistance: 1000,
      },
    },
  };

  constructor(options: SpatialAudioOptions = {}) {
    this.options = {
      enableDoppler: options.enableDoppler ?? true,
      enableReverb: options.enableReverb ?? true,
      enableDirectionality: options.enableDirectionality ?? true,
      masterVolume: options.masterVolume ?? 0.5,
      spatialRange: options.spatialRange ?? 2000,
    };

    this.state = {
      listener: { x: 0, y: 0, z: 0, zoom: 1 },
      activeSources: new Map(),
      spatialNodes: new Map(),
    };
  }

  /**
   * Initialize the spatial audio engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.listener = this.audioContext.listener;
      
      // Set up master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.options.masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      // Set up compressor for consistent volume levels
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -50;
      this.compressor.knee.value = 40;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0;
      this.compressor.release.value = 0.25;
      this.compressor.connect(this.masterGain);

      // Set up reverb if enabled
      if (this.options.enableReverb) {
        await this.setupReverb();
      }

      // Load default audio cues
      await this.loadDefaultCues();

      this.isInitialized = true;
      console.log('🔊 Spatial Audio Engine initialized');
    } catch (error) {
      console.warn('Spatial Audio initialization failed:', error);
    }
  }

  /**
   * Update listener position based on viewport
   */
  updateListener(viewport: { x: number; y: number; zoom: number }): void {
    if (!this.listener || !this.isInitialized) return;

    const { x, y, zoom } = viewport;
    
    // Convert viewport coordinates to 3D audio space
    const audioX = x / 100; // Scale down for audio coordinate system
    const audioY = y / 100;
    const audioZ = Math.log(zoom) * 10; // Use zoom for height dimension
    
    this.state.listener = { x: audioX, y: audioY, z: audioZ, zoom };

    // Update AudioListener position (if supported)
    if (this.listener.positionX) {
      this.listener.positionX.value = audioX;
      this.listener.positionY.value = audioY;
      this.listener.positionZ.value = audioZ;
    } else if ((this.listener as any).setPosition) {
      // Fallback for older browsers
      (this.listener as any).setPosition(audioX, audioY, audioZ);
    }

    // Update forward vector based on zoom (closer zoom = more focused listening)
    if (this.listener.forwardX) {
      this.listener.forwardX.value = 0;
      this.listener.forwardY.value = 0;
      this.listener.forwardZ.value = -1;
    }

    // Update active spatial sources
    this.updateSpatialSources();
  }

  /**
   * Play a spatial audio cue at a specific position
   */
  async playCue(
    cueId: string, 
    position?: { x: number; y: number; z?: number },
    customProperties?: Partial<AudioCue>
  ): Promise<void> {
    if (!this.isInitialized || !this.audioContext) return;

    const cue = { ...this.defaultCues[cueId], ...customProperties };
    
    if (!cue.url && !cue.buffer) {
      console.warn(`Audio cue '${cueId}' has no audio source`);
      return;
    }

    try {
      let buffer = cue.buffer;
      
      // Load buffer if needed
      if (!buffer && cue.url) {
        buffer = await this.loadAudioBuffer(cue.url);
      }
      
      if (!buffer) return;

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = cue.loop || false;

      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = cue.volume || 1;

      // Set up spatial audio if position is provided
      if (position && this.options.enableDirectionality) {
        const pannerNode = this.createSpatialNode(position, cue.spatialProperties);
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.getAudioDestination());
        
        this.state.spatialNodes.set(cueId, pannerNode);
      } else {
        source.connect(gainNode);
        gainNode.connect(this.getAudioDestination());
      }

      // Store active source
      this.state.activeSources.set(cueId, source);

      // Clean up when finished
      source.onended = () => {
        this.state.activeSources.delete(cueId);
        this.state.spatialNodes.delete(cueId);
      };

      // Start playback
      source.start();
      
    } catch (error) {
      console.warn(`Failed to play audio cue '${cueId}':`, error);
    }
  }

  /**
   * Play transition sound with doppler effect
   */
  async playTransition(
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number },
    duration: number,
    transitionType: string = 'slide'
  ): Promise<void> {
    if (!this.options.enableDoppler) return;

    const cueId = `transition-${Date.now()}`;
    const audioTransitionType = this.mapTransitionTypeToAudio(transitionType);
    
    await this.playCue(cueId, fromPosition, {
      type: 'transition',
      url: this.getTransitionAudioUrl(audioTransitionType),
    });

    // Animate audio source position if doppler is enabled
    if (this.state.spatialNodes.has(cueId)) {
      const pannerNode = this.state.spatialNodes.get(cueId)!;
      const startTime = this.audioContext!.currentTime;
      
      // Animate from start to end position
      if (pannerNode.positionX) {
        pannerNode.positionX.setValueAtTime(fromPosition.x / 100, startTime);
        pannerNode.positionX.linearRampToValueAtTime(toPosition.x / 100, startTime + duration / 1000);
        
        pannerNode.positionY.setValueAtTime(fromPosition.y / 100, startTime);
        pannerNode.positionY.linearRampToValueAtTime(toPosition.y / 100, startTime + duration / 1000);
      }
    }
  }

  /**
   * Play ambient spatial audio
   */
  async playAmbient(elementId: string, position: { x: number; y: number }): Promise<void> {
    await this.playCue(`ambient-${elementId}`, position, {
      type: 'ambient',
      loop: true,
      volume: 0.1,
      url: this.getAmbientAudioUrl(),
    });
  }

  /**
   * Stop a specific audio cue
   */
  stopCue(cueId: string): void {
    const source = this.state.activeSources.get(cueId);
    if (source) {
      try {
        source.stop();
      } catch (error) {
        // Source may already be stopped
      }
      this.state.activeSources.delete(cueId);
      this.state.spatialNodes.delete(cueId);
    }
  }

  /**
   * Stop all audio
   */
  stopAll(): void {
    for (const [cueId] of this.state.activeSources) {
      this.stopCue(cueId);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    this.options.masterVolume = volume;
  }

  /**
   * Get current audio state for debugging
   */
  getAudioState(): SpatialAudioState {
    return {
      listener: { ...this.state.listener },
      activeSources: new Map(this.state.activeSources),
      spatialNodes: new Map(this.state.spatialNodes),
    };
  }

  /**
   * Private methods
   */
  private createSpatialNode(
    position: { x: number; y: number; z?: number },
    properties?: AudioCue['spatialProperties']
  ): PannerNode {
    const pannerNode = this.audioContext!.createPanner();
    
    // Set spatial properties
    pannerNode.panningModel = properties?.panningModel || 'HRTF';
    pannerNode.distanceModel = properties?.distanceModel || 'inverse';
    pannerNode.rolloffFactor = properties?.rolloffFactor || 1;
    pannerNode.maxDistance = properties?.maxDistance || this.options.spatialRange;

    // Set position
    const audioX = position.x / 100;
    const audioY = position.y / 100;
    const audioZ = position.z || 0;

    if (pannerNode.positionX) {
      pannerNode.positionX.value = audioX;
      pannerNode.positionY.value = audioY;
      pannerNode.positionZ.value = audioZ;
    } else if ((pannerNode as any).setPosition) {
      // Fallback for older browsers
      (pannerNode as any).setPosition(audioX, audioY, audioZ);
    }

    return pannerNode;
  }

  private async setupReverb(): Promise<void> {
    if (!this.audioContext) return;

    this.reverbNode = this.audioContext.createConvolver();
    
    // Create a simple reverb impulse response
    const impulseBuffer = this.createReverbImpulse();
    this.reverbNode.buffer = impulseBuffer;
    
    const reverbGain = this.audioContext.createGain();
    reverbGain.gain.value = 0.2; // Subtle reverb
    
    this.reverbNode.connect(reverbGain);
    reverbGain.connect(this.compressor || this.masterGain!);
  }

  private createReverbImpulse(): AudioBuffer {
    const length = this.audioContext!.sampleRate * 2; // 2 second reverb
    const impulse = this.audioContext!.createBuffer(2, length, this.audioContext!.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    return impulse;
  }

  private async loadDefaultCues(): Promise<void> {
    // Load basic audio cues (in a real implementation, these would be actual audio files)
    const promises = Object.entries(this.defaultCues).map(async ([cueId, cue]) => {
      if (cue.url && cue.url.startsWith('data:audio/')) {
        try {
          const buffer = await this.loadAudioBuffer(cue.url);
          this.audioBuffers.set(cueId, buffer);
        } catch (error) {
          console.warn(`Failed to load default cue '${cueId}':`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext!.decodeAudioData(arrayBuffer);
  }

  private updateSpatialSources(): void {
    // Update positions of all active spatial sources based on listener movement
    for (const [cueId, pannerNode] of this.state.spatialNodes) {
      // In a more advanced implementation, you could adjust spatial parameters
      // based on listener movement, zoom level, etc.
    }
  }

  private getAudioDestination(): AudioNode {
    if (this.options.enableReverb && this.reverbNode) {
      return this.reverbNode;
    }
    return this.compressor || this.masterGain!;
  }

  private mapTransitionTypeToAudio(transitionType: string): string {
    const mapping: Record<string, string> = {
      'slide': 'whoosh',
      'zoom': 'zoom',
      'fade': 'fade',
      'flip': 'flip',
      'push': 'push',
      'cover': 'slide',
    };
    return mapping[transitionType] || 'generic';
  }

  private getTransitionAudioUrl(audioType: string): string {
    // In a real implementation, these would be actual audio file URLs
    const audioUrls: Record<string, string> = {
      'whoosh': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...',
      'zoom': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...',
      'fade': 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...',
      'generic': this.defaultCues['pan-start'].url!,
    };
    return audioUrls[audioType] || audioUrls['generic'];
  }

  private getAmbientAudioUrl(): string {
    // Return a subtle ambient sound URL
    return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA...';
  }
}