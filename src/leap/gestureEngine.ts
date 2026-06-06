import type {
  HandChirality,
  InteractionMode,
  PinchThresholds,
  PinchTransition,
} from './types';

const HANDS: HandChirality[] = ['left', 'right'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getInteractiveCursor(element: Element): string {
  if (!(element instanceof HTMLElement)) return '';
  return getComputedStyle(element).cursor;
}

function hasDragCursor(cursor: string): boolean {
  return (
    cursor.includes('grab') ||
    cursor.includes('grabbing') ||
    cursor.includes('move') ||
    cursor.includes('resize') ||
    cursor === 'all-scroll'
  );
}

function isScrollableElement(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  const overflowY = style.overflowY;
  const overflowX = style.overflowX;

  const scrollY =
    (overflowY === 'auto' || overflowY === 'scroll') &&
    element.scrollHeight > element.clientHeight;
  const scrollX =
    (overflowX === 'auto' || overflowX === 'scroll') &&
    element.scrollWidth > element.clientWidth;

  return scrollY || scrollX;
}

function hasAncestorDragCursor(target: Element): boolean {
  let current: Element | null = target;
  while (current) {
    if (hasDragCursor(getInteractiveCursor(current))) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export class GestureEngine {
  private pinching: Record<HandChirality, boolean> = {
    left: false,
    right: false,
  };

  reset() {
    this.pinching.left = false;
    this.pinching.right = false;
  }

  updatePinchTransitions(
    pinchByHand: Partial<Record<HandChirality, number>>,
    thresholds: PinchThresholds
  ): PinchTransition[] {
    const pinchThreshold = clamp(thresholds.pinchThreshold, 0, 1);
    const releaseThreshold = clamp(thresholds.releaseThreshold, 0, 1);

    return HANDS.map((hand) => {
      const pinchStrength = clamp(pinchByHand[hand] ?? 0, 0, 1);
      const wasPinching = this.pinching[hand];

      let isPinching = wasPinching;
      if (!wasPinching && pinchStrength >= pinchThreshold) {
        isPinching = true;
      } else if (wasPinching && pinchStrength <= releaseThreshold) {
        isPinching = false;
      }

      this.pinching[hand] = isPinching;

      return {
        hand,
        isPinching,
        started: !wasPinching && isPinching,
        ended: wasPinching && !isPinching,
        pinchStrength,
      };
    });
  }

  static getInitialMode(target: Element | null): InteractionMode {
    if (!target) {
      return 'pressCandidate';
    }

    if (GestureEngine.isDraggableTarget(target)) {
      return 'drag';
    }

    return 'pressCandidate';
  }

  static isDraggableTarget(target: Element): boolean {
    if (!(target instanceof HTMLElement)) {
      return hasAncestorDragCursor(target);
    }

    if (
      target.closest('.window-title-bar') ||
      target.closest('.resize-handle') ||
      target.closest('[data-tab-id]') ||
      target.closest('[draggable="true"]')
    ) {
      return true;
    }

    return hasAncestorDragCursor(target);
  }

  static isDirectManipulationTarget(target: Element | null): boolean {
    if (!target) {
      return false;
    }

    if (target.closest('.mermaid-svg-container')) {
      return true;
    }

    if (target instanceof HTMLCanvasElement || Boolean(target.closest('canvas'))) {
      return true;
    }

    if (target instanceof SVGElement && !target.closest('button, a, input, textarea, select')) {
      return true;
    }

    if (target instanceof HTMLElement) {
      const touchAction = getComputedStyle(target).touchAction;
      if (touchAction === 'none') {
        return true;
      }
    }

    return false;
  }

  static hasScrollableAncestor(target: Element | null): boolean {
    let current: Element | null = target;
    while (current && current instanceof HTMLElement) {
      if (isScrollableElement(current)) {
        return true;
      }
      current = current.parentElement;
    }

    const root = document.scrollingElement;
    if (root instanceof HTMLElement) {
      return root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth;
    }

    return false;
  }

  static shouldUseScrollFallback(target: Element | null): boolean {
    if (!target) {
      return false;
    }

    if (GestureEngine.isDirectManipulationTarget(target)) {
      return false;
    }

    return GestureEngine.hasScrollableAncestor(target);
  }
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
