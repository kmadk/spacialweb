/**
 * Advanced easing functions for cinematic spatial transitions
 * Specialized easing curves designed for narrative and emotional impact
 */

export type EasingFunction = (t: number) => number;

export interface CinematicEasing {
  name: string;
  description: string;
  emotionalTone: 'dramatic' | 'playful' | 'calm' | 'professional' | 'mysterious';
  function: EasingFunction;
}

/**
 * Collection of cinematic easing functions optimized for spatial navigation
 */
export class CinematicEasingLibrary {
  private static readonly easings: Record<string, CinematicEasing> = {
    // Dramatic easing functions
    'dramatic-entrance': {
      name: 'Dramatic Entrance',
      description: 'Slow start with explosive finish - perfect for reveals',
      emotionalTone: 'dramatic',
      function: (t: number) => {
        // Custom curve: very slow start, then explosive acceleration
        if (t < 0.7) {
          return 0.1 * Math.pow(t / 0.7, 3);
        } else {
          const remaining = (t - 0.7) / 0.3;
          return 0.1 + 0.9 * Math.pow(remaining, 0.3);
        }
      },
    },

    'dramatic-zoom': {
      name: 'Dramatic Zoom',
      description: 'Intense zoom with cinematic timing',
      emotionalTone: 'dramatic',
      function: (t: number) => {
        // S-curve with dramatic acceleration in the middle
        return 0.5 * (1 + Math.tanh(6 * (t - 0.5)));
      },
    },

    'suspense-build': {
      name: 'Suspense Build',
      description: 'Gradual buildup with tension',
      emotionalTone: 'mysterious',
      function: (t: number) => {
        // Exponential buildup with slight hesitations
        const base = Math.pow(t, 2);
        const hesitation = 0.1 * Math.sin(t * Math.PI * 3) * (1 - t);
        return Math.max(0, Math.min(1, base + hesitation));
      },
    },

    // Playful easing functions
    'playful-bounce': {
      name: 'Playful Bounce',
      description: 'Energetic bounce with overshoot',
      emotionalTone: 'playful',
      function: (t: number) => {
        // Enhanced bounce with multiple overshoots
        if (t < 0.8) {
          return easeOutBounce(t / 0.8) * 0.9;
        } else {
          const overshoot = (t - 0.8) / 0.2;
          return 0.9 + 0.15 * Math.sin(overshoot * Math.PI * 2) * (1 - overshoot);
        }
      },
    },

    'elastic-snap': {
      name: 'Elastic Snap',
      description: 'Elastic overshoot with satisfying snap back',
      emotionalTone: 'playful',
      function: (t: number) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        
        const period = 0.3;
        const amplitude = 1.2;
        const s = period / 4;
        
        return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
      },
    },

    'wobble': {
      name: 'Wobble',
      description: 'Playful wobble effect for attention',
      emotionalTone: 'playful',
      function: (t: number) => {
        const base = easeInOutCubic(t);
        const wobble = 0.1 * Math.sin(t * Math.PI * 6) * (1 - t) * t;
        return base + wobble;
      },
    },

    // Calm/Documentary easing functions
    'documentary-smooth': {
      name: 'Documentary Smooth',
      description: 'Ultra-smooth movement like a documentary camera',
      emotionalTone: 'calm',
      function: (t: number) => {
        // Super smooth S-curve
        return t * t * t * (t * (t * 6 - 15) + 10);
      },
    },

    'natural-flow': {
      name: 'Natural Flow',
      description: 'Organic, natural movement pattern',
      emotionalTone: 'calm',
      function: (t: number) => {
        // Based on natural motion curves
        return 1 - Math.cos(t * Math.PI / 2);
      },
    },

    'gentle-drift': {
      name: 'Gentle Drift',
      description: 'Soft, floating movement',
      emotionalTone: 'calm',
      function: (t: number) => {
        // Gentle sigmoid with soft start and end
        return 0.5 * (1 + Math.tanh(4 * (t - 0.5)));
      },
    },

    // Professional easing functions
    'professional-snap': {
      name: 'Professional Snap',
      description: 'Quick, efficient movement for business apps',
      emotionalTone: 'professional',
      function: (t: number) => {
        // Fast start, controlled finish
        return 1 - Math.pow(1 - t, 3);
      },
    },

    'corporate-slide': {
      name: 'Corporate Slide',
      description: 'Clean, measured progression',
      emotionalTone: 'professional',
      function: (t: number) => {
        // Linear with slight easing at ends
        if (t < 0.1) {
          return 5 * t * t;
        } else if (t > 0.9) {
          const remaining = (1 - t) / 0.1;
          return 1 - 0.5 * remaining * remaining;
        } else {
          return 0.05 + 0.9 * (t - 0.1) / 0.8;
        }
      },
    },

    'business-efficient': {
      name: 'Business Efficient',
      description: 'No-nonsense, direct movement',
      emotionalTone: 'professional',
      function: (t: number) => {
        // Modified cubic with faster middle
        return t * t * (3 - 2 * t);
      },
    },

    // Mysterious/Atmospheric easing functions
    'mysterious-reveal': {
      name: 'Mysterious Reveal',
      description: 'Gradual, atmospheric revelation',
      emotionalTone: 'mysterious',
      function: (t: number) => {
        // Slow start with atmospheric build
        const base = Math.pow(t, 1.5);
        const atmosphere = 0.1 * Math.sin(t * Math.PI * 2) * (1 - t);
        return base + atmosphere;
      },
    },

    'shadow-creep': {
      name: 'Shadow Creep',
      description: 'Slow, creeping movement with subtle variations',
      emotionalTone: 'mysterious',
      function: (t: number) => {
        // Very slow with micro-variations
        const base = Math.pow(t, 2.5);
        const creep = 0.05 * Math.sin(t * Math.PI * 8) * t * (1 - t);
        return base + creep;
      },
    },

    // Multi-stage cinematic easings
    'three-act': {
      name: 'Three Act Structure',
      description: 'Movement following classic three-act narrative structure',
      emotionalTone: 'dramatic',
      function: (t: number) => {
        if (t < 0.25) {
          // Act 1: Setup - gentle start
          return 2 * t * t;
        } else if (t < 0.75) {
          // Act 2: Confrontation - rapid development
          const local = (t - 0.25) / 0.5;
          return 0.125 + 0.75 * easeInOutQuad(local);
        } else {
          // Act 3: Resolution - satisfying conclusion
          const local = (t - 0.75) / 0.25;
          return 0.875 + 0.125 * easeOutCubic(local);
        }
      },
    },

    'hero-journey': {
      name: 'Hero Journey Arc',
      description: 'Following the hero\'s journey narrative pattern',
      emotionalTone: 'dramatic',
      function: (t: number) => {
        if (t < 0.15) {
          // Ordinary world - slow start
          return 0.5 * t / 0.15;
        } else if (t < 0.4) {
          // Call to adventure - acceleration
          const local = (t - 0.15) / 0.25;
          return 0.5 + 0.3 * easeInQuad(local);
        } else if (t < 0.7) {
          // Trials - intense middle
          const local = (t - 0.4) / 0.3;
          return 0.8 + 0.15 * Math.sin(local * Math.PI);
        } else {
          // Return transformed - triumphant finish
          const local = (t - 0.7) / 0.3;
          return 0.95 + 0.05 * easeOutBack(local);
        }
      },
    },

    // Parallax and depth easings
    'depth-parallax': {
      name: 'Depth Parallax',
      description: 'Creates sense of depth with layered movement',
      emotionalTone: 'cinematic',
      function: (t: number) => {
        // Non-linear progression for parallax effect
        const base = easeInOutQuart(t);
        const depth = 0.1 * Math.sin(t * Math.PI) * (1 - Math.abs(t - 0.5) * 2);
        return base + depth;
      },
    } as CinematicEasing,
  };

  /**
   * Get an easing function by name
   */
  static getEasing(name: string): EasingFunction {
    const easing = this.easings[name];
    return easing ? easing.function : easeInOutCubic;
  }

  /**
   * Get easing by emotional tone
   */
  static getEasingsByTone(tone: CinematicEasing['emotionalTone']): CinematicEasing[] {
    return Object.values(this.easings).filter(e => e.emotionalTone === tone);
  }

  /**
   * Get all available easing functions
   */
  static getAllEasings(): Record<string, CinematicEasing> {
    return { ...this.easings };
  }

  /**
   * Create a custom multi-segment easing
   */
  static createMultiSegment(segments: Array<{ duration: number; easing: EasingFunction }>): EasingFunction {
    return (t: number) => {
      const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
      let currentTime = t * totalDuration;
      let accumulatedDuration = 0;
      let accumulatedProgress = 0;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentStart = accumulatedDuration;
        const segmentEnd = accumulatedDuration + segment.duration;

        if (currentTime <= segmentEnd) {
          const localProgress = (currentTime - segmentStart) / segment.duration;
          const localEased = segment.easing(Math.max(0, Math.min(1, localProgress)));
          const segmentWeight = segment.duration / totalDuration;
          return accumulatedProgress + localEased * segmentWeight;
        }

        accumulatedDuration += segment.duration;
        accumulatedProgress += segment.duration / totalDuration;
      }

      return 1;
    };
  }

  /**
   * Combine two easing functions with a blend ratio
   */
  static blend(easing1: EasingFunction, easing2: EasingFunction, ratio: number): EasingFunction {
    return (t: number) => {
      const value1 = easing1(t);
      const value2 = easing2(t);
      return value1 * (1 - ratio) + value2 * ratio;
    };
  }

  /**
   * Add noise/variation to an easing function
   */
  static addNoise(baseEasing: EasingFunction, intensity: number = 0.1, frequency: number = 3): EasingFunction {
    return (t: number) => {
      const base = baseEasing(t);
      const noise = intensity * Math.sin(t * Math.PI * frequency) * t * (1 - t);
      return Math.max(0, Math.min(1, base + noise));
    };
  }

  /**
   * Create an easing with anticipation (slight backward movement before forward)
   */
  static withAnticipation(baseEasing: EasingFunction, anticipationAmount: number = 0.1): EasingFunction {
    return (t: number) => {
      if (t < 0.1) {
        // Anticipation phase
        return -anticipationAmount * Math.sin((t / 0.1) * Math.PI);
      } else {
        // Main movement phase
        const adjustedT = (t - 0.1) / 0.9;
        return baseEasing(adjustedT) * (1 + anticipationAmount) - anticipationAmount;
      }
    };
  }
}

// Standard easing functions for reference
export function easeInQuad(t: number): number {
  return t * t;
}

export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutCubic(t: number): number {
  return --t * t * t + 1;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

export function easeInQuart(t: number): number {
  return t * t * t * t;
}

export function easeOutQuart(t: number): number {
  return 1 - --t * t * t * t;
}

export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

/**
 * Utility to visualize easing curves (for debugging)
 */
export function visualizeEasing(easingFunction: EasingFunction, samples: number = 100): string {
  let result = 'Easing curve visualization:\n';
  const width = 50;
  
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const value = easingFunction(t);
    const position = Math.round(value * width);
    
    result += t.toFixed(2).padStart(4) + ' |';
    result += ' '.repeat(position) + '*';
    result += ' '.repeat(width - position) + '|\n';
  }
  
  return result;
}