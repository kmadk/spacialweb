import type { Viewport, TransitionOptions, EasingFunction } from './types.js';

interface Animation {
  start(): void;
  cancel(): void;
}

export class TransitionManager {
  private activeTransition: Animation | null = null;

  async animateToViewport(
    start: Viewport,
    end: Viewport,
    options: TransitionOptions,
    onUpdate: (viewport: Viewport) => void
  ): Promise<void> {
    if (this.activeTransition) {
      this.activeTransition.cancel();
    }

    const config = {
      duration: options.duration ?? 800,
      easing: options.easing ?? 'easeInOutCubic' as EasingFunction,
      ...options,
    };

    return new Promise((resolve, reject) => {
      this.activeTransition = this.createAnimation(
        start,
        end,
        config,
        onUpdate,
        resolve,
        reject
      );

      this.activeTransition.start();
    });
  }

  private createAnimation(
    start: Viewport,
    end: Viewport,
    config: Required<TransitionOptions>,
    onUpdate: (viewport: Viewport) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Animation {
    const startTime = performance.now();
    let animationFrame: number;
    let cancelled = false;

    const animate = (currentTime: number): void => {
      if (cancelled) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / config.duration, 1);

      const easedProgress = this.applyEasing(progress, config.easing);

      const currentViewport = this.interpolateViewport(start, end, easedProgress);

      onUpdate(currentViewport);

      config.onProgress?.(progress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        config.onComplete?.();
        onComplete();
      }
    };

    return {
      start: () => {
        animationFrame = requestAnimationFrame(animate);
      },
      cancel: () => {
        cancelled = true;
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      },
    };
  }

  private interpolateViewport(start: Viewport, end: Viewport, t: number): Viewport {
    return {
      x: this.lerp(start.x, end.x, t),
      y: this.lerp(start.y, end.y, t),
      zoom: Math.exp(this.lerp(Math.log(start.zoom), Math.log(end.zoom), t)),
      width: start.width,
      height: start.height,
    };
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private applyEasing(t: number, easing: EasingFunction): number {
    switch (easing) {
      case 'linear':
        return t;

      case 'easeInOutCubic':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      case 'easeOutQuart':
        return 1 - Math.pow(1 - t, 4);

      case 'easeOutExpo':
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

      case 'easeInOutBack': {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
          ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
          : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
      }

      default:
        return t;
    }
  }

  cancel(): void {
    if (this.activeTransition) {
      this.activeTransition.cancel();
      this.activeTransition = null;
    }
  }

  isAnimating(): boolean {
    return this.activeTransition !== null;
  }
}