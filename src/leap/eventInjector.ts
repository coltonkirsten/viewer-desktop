import type { HandChirality } from './types';

interface PointerLikeOptions {
  x: number;
  y: number;
  hand: HandChirality;
  button: number;
  buttons: number;
}

const HAND_POINTER_ID: Record<HandChirality, number> = {
  left: 101,
  right: 102,
};

function buttonsMask(button: number): number {
  if (button === 2) return 2;
  return 1;
}

function isSupportedTarget(target: Element | null): target is Element {
  if (!target) return false;
  if (target.closest('webview')) return false;
  return true;
}

function getInjectableElementAtPoint(x: number, y: number): Element | null {
  const elements = document.elementsFromPoint(x, y);
  if (elements[0]?.closest('webview')) {
    return null;
  }

  for (const element of elements) {
    if (isSupportedTarget(element)) {
      return element;
    }
  }
  return null;
}

function pointerEvent(type: string, options: PointerLikeOptions): Event {
  const base = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: options.x,
    clientY: options.y,
    screenX: window.screenX + options.x,
    screenY: window.screenY + options.y,
    button: options.button,
    buttons: options.buttons,
    pointerId: HAND_POINTER_ID[options.hand],
    pointerType: 'mouse',
    isPrimary: options.hand === 'right',
  };

  if (typeof PointerEvent !== 'undefined') {
    return new PointerEvent(type, base);
  }

  return new MouseEvent(type, base);
}

function mouseEvent(type: string, options: PointerLikeOptions): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: options.x,
    clientY: options.y,
    screenX: window.screenX + options.x,
    screenY: window.screenY + options.y,
    button: options.button,
    buttons: options.buttons,
  });
}

function dispatchReleaseFallback(
  hand: HandChirality,
  x: number,
  y: number,
  button: number
) {
  const options: PointerLikeOptions = {
    x,
    y,
    hand,
    button,
    buttons: 0,
  };

  const pUp = pointerEvent('pointerup', options);
  const mUp = mouseEvent('mouseup', options);

  // Some controls (e.g. 3D/canvas libs) bind release handlers on document/window.
  document.dispatchEvent(pUp);
  document.dispatchEvent(mUp);
  window.dispatchEvent(pointerEvent('pointerup', options));
  window.dispatchEvent(mouseEvent('mouseup', options));
}

function closestScrollable(element: Element | null): Element | Document {
  let current = element;
  while (current && current instanceof HTMLElement) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;

    const scrollY =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight;
    const scrollX =
      (overflowX === 'auto' || overflowX === 'scroll') &&
      current.scrollWidth > current.clientWidth;

    if (scrollY || scrollX) {
      return current;
    }

    current = current.parentElement;
  }

  return document;
}

export class EventInjector {
  private pressedTargetByHand: Partial<Record<HandChirality, Element>> = {};
  private pressedButtonByHand: Partial<Record<HandChirality, number>> = {};

  hasPressedButtons(): boolean {
    return Boolean(this.pressedTargetByHand.left || this.pressedTargetByHand.right);
  }

  getTargetAtPoint(x: number, y: number): Element | null {
    return getInjectableElementAtPoint(x, y);
  }

  isInjectableTarget(target: Element | null): boolean {
    return isSupportedTarget(target);
  }

  pointerDown(
    hand: HandChirality,
    x: number,
    y: number,
    target?: Element | null,
    button = 0
  ): Element | null {
    const resolved = target ?? this.getTargetAtPoint(x, y);
    if (!isSupportedTarget(resolved)) {
      return null;
    }

    this.pressedTargetByHand[hand] = resolved;
    this.pressedButtonByHand[hand] = button;

    const options: PointerLikeOptions = {
      x,
      y,
      hand,
      button,
      buttons: buttonsMask(button),
    };

    resolved.dispatchEvent(pointerEvent('pointerdown', options));
    resolved.dispatchEvent(mouseEvent('mousedown', options));

    return resolved;
  }

  pointerMove(hand: HandChirality, x: number, y: number, isPressed: boolean) {
    const button = this.pressedButtonByHand[hand] ?? 0;
    const target = isPressed
      ? this.pressedTargetByHand[hand] ?? this.getTargetAtPoint(x, y)
      : this.getTargetAtPoint(x, y);

    if (!isSupportedTarget(target)) {
      return;
    }

    const options: PointerLikeOptions = {
      x,
      y,
      hand,
      button,
      buttons: isPressed ? buttonsMask(button) : 0,
    };

    target.dispatchEvent(pointerEvent('pointermove', options));
    target.dispatchEvent(mouseEvent('mousemove', options));
  }

  pointerUp(
    hand: HandChirality,
    x: number,
    y: number,
    target?: Element | null,
    button?: number
  ) {
    const resolved =
      target ?? this.pressedTargetByHand[hand] ?? this.getTargetAtPoint(x, y);
    if (!isSupportedTarget(resolved)) {
      delete this.pressedTargetByHand[hand];
      delete this.pressedButtonByHand[hand];
      return;
    }

    const effectiveButton = button ?? this.pressedButtonByHand[hand] ?? 0;
    const options: PointerLikeOptions = {
      x,
      y,
      hand,
      button: effectiveButton,
      buttons: 0,
    };

    resolved.dispatchEvent(pointerEvent('pointerup', options));
    resolved.dispatchEvent(mouseEvent('mouseup', options));
    dispatchReleaseFallback(hand, x, y, effectiveButton);
    delete this.pressedTargetByHand[hand];
    delete this.pressedButtonByHand[hand];
  }

  click(
    hand: HandChirality,
    x: number,
    y: number,
    target?: Element | null,
    button = 0
  ) {
    const resolved = target ?? this.getTargetAtPoint(x, y);
    if (!isSupportedTarget(resolved)) {
      return;
    }

    const options: PointerLikeOptions = {
      x,
      y,
      hand,
      button,
      buttons: 0,
    };

    if (button === 0 && resolved instanceof HTMLElement) {
      resolved.click();
      return;
    }

    resolved.dispatchEvent(mouseEvent(button === 2 ? 'contextmenu' : 'click', options));
  }

  wheel(hand: HandChirality, x: number, y: number, deltaX: number, deltaY: number) {
    if (document.elementFromPoint(x, y)?.closest('webview')) {
      return;
    }

    const target = closestScrollable(this.getTargetAtPoint(x, y));

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      screenX: window.screenX + x,
      screenY: window.screenY + y,
      deltaX,
      deltaY,
      deltaMode: WheelEvent.DOM_DELTA_PIXEL,
      buttons: this.pressedTargetByHand[hand]
        ? buttonsMask(this.pressedButtonByHand[hand] ?? 0)
        : 0,
    });

    target.dispatchEvent(event);

    if (!event.defaultPrevented) {
      if (target instanceof HTMLElement) {
        target.scrollLeft += deltaX;
        target.scrollTop += deltaY;
      } else {
        window.scrollBy({
          left: deltaX,
          top: deltaY,
          behavior: 'auto',
        });
      }
    }
  }

  forceRelease(hand: HandChirality, x: number, y: number) {
    this.pointerUp(hand, x, y, this.pressedTargetByHand[hand] ?? null);
  }

  clearAll() {
    for (const hand of ['left', 'right'] as HandChirality[]) {
      const target = this.pressedTargetByHand[hand];
      if (target) {
        this.pointerUp(hand, 0, 0, target, this.pressedButtonByHand[hand] ?? 0);
      }
    }
  }
}
