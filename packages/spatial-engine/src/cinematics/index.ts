/**
 * Cinematic movement system for spatial navigation
 * Advanced choreography and narrative-driven transitions
 */

export {
  FlowChoreographer,
  type PenpotFlow,
  type PenpotConnection,
  type CinematicMovement,
  type CinematicSequence,
  type CinematicKeyframe,
} from './flow-choreographer.js';

export {
  PenpotFlowParser,
  type FlowExtractionResult,
} from './penpot-flow-parser.js';

export {
  CinematicEasingLibrary,
  type CinematicEasing,
  type EasingFunction,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeOutBack,
  easeOutBounce,
  visualizeEasing,
} from './cinematic-easing.js';

export {
  SpatialAudioEngine,
  type SpatialAudioOptions,
  type AudioCue,
  type SpatialAudioState,
} from './spatial-audio.js';

export {
  CinematicDemo,
  type CinematicDemoOptions,
  type DemoScenario,
} from './cinematic-demo.js';