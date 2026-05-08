import { useCallback, useEffect, useRef, useState } from 'react';
import { LeapWebSocketClient } from '../../leap/LeapWebSocketClient';
import { mapHandsToCursors, type CursorStateMap } from '../../leap/cursorMapping';
import { EventInjector } from '../../leap/eventInjector';
import { GestureEngine, distance } from '../../leap/gestureEngine';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLeapStore } from '../../stores/leapStore';
import { LeapOverlay } from './LeapOverlay';
import type {
  ActiveInteraction,
  CursorState,
  HandChirality,
  LeapFrame,
} from '../../leap/types';
import type { LeapHoverPrimaryHand } from '../../stores/settingsStore';

const HANDS: HandChirality[] = ['left', 'right'];

interface HandRuntimeState {
  cursor: { x: number; y: number } | null;
  pinchStrength: number;
  lastSeenAt: number;
}

function chooseHoverHand(
  handState: Partial<Record<HandChirality, HandRuntimeState>>,
  now: number,
  staleHandMs: number,
  preferredHand: LeapHoverPrimaryHand
): HandChirality | null {
  const isTracked = (hand: HandChirality): boolean => {
    const state = handState[hand];
    return Boolean(state && now - state.lastSeenAt <= staleHandMs && state.cursor);
  };

  if (preferredHand === 'mostRecent') {
    const trackedHands = HANDS.filter((hand) => isTracked(hand));
    if (trackedHands.length === 0) return null;
    if (trackedHands.length === 1) return trackedHands[0];
    return (handState.left?.lastSeenAt ?? 0) > (handState.right?.lastSeenAt ?? 0) ? 'left' : 'right';
  }

  const first = preferredHand === 'left' ? 'left' : 'right';
  const second = first === 'left' ? 'right' : 'left';

  if (isTracked(first)) return first;
  if (isTracked(second)) return second;

  return null;
}

export function LeapControllerLayer() {
  const leapSettings = useSettingsStore((s) => s.settings.input.leap);

  const setLeapStatus = useLeapStore((s) => s.setStatus);
  const setLeapEndpoint = useLeapStore((s) => s.setEndpoint);
  const setTrackedHands = useLeapStore((s) => s.setTrackedHands);
  const connectionStatus = useLeapStore((s) => s.connectionStatus);

  const [cursors, setCursors] = useState<CursorState[]>([]);

  const latestFrameRef = useRef<LeapFrame | null>(null);
  const lastProcessedFrameIdRef = useRef<string | null>(null);
  const cursorMapRef = useRef<CursorStateMap>({});
  const handStateRef = useRef<Partial<Record<HandChirality, HandRuntimeState>>>({});

  const clientRef = useRef<LeapWebSocketClient | null>(null);
  const rafRef = useRef<number | null>(null);

  const gestureEngineRef = useRef(new GestureEngine());
  const injectorRef = useRef(new EventInjector());

  const lockHandRef = useRef<HandChirality | null>(null);
  const interactionRef = useRef<ActiveInteraction | null>(null);
  const lastHoverMoveRef = useRef(0);
  const isFocusedRef = useRef(document.hasFocus());

  const beginInteraction = useCallback((hand: HandChirality) => {
    const state = handStateRef.current[hand];
    if (!state?.cursor) return;

    const x = state.cursor.x;
    const y = state.cursor.y;

    const injector = injectorRef.current;
    // Safety: clear any stale pressed state before starting a new interaction.
    injector.forceRelease(hand, x, y);
    const target = injector.getTargetAtPoint(x, y);
    const injectable = injector.isInjectableTarget(target);

    const initialMode = injectable
      ? GestureEngine.getInitialMode(target)
      : 'pressCandidate';

    let hasPointerDown = false;
    if (injectable) {
      hasPointerDown = Boolean(injector.pointerDown(hand, x, y, target));
    }

    interactionRef.current = {
      hand,
      mode: initialMode,
      target,
      startedAt: Date.now(),
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      totalDistance: 0,
      hasPointerDown,
    };
  }, []);

  const endInteraction = useCallback((hand: HandChirality, cancelClick: boolean) => {
    const interaction = interactionRef.current;
    const state = handStateRef.current[hand];
    const fallbackX = state?.cursor?.x ?? 0;
    const fallbackY = state?.cursor?.y ?? 0;
    const injector = injectorRef.current;

    if (!interaction || interaction.hand !== hand) {
      injector.forceRelease(hand, fallbackX, fallbackY);
      lockHandRef.current = null;
      return;
    }

    const x = state?.cursor?.x ?? interaction.lastX;
    const y = state?.cursor?.y ?? interaction.lastY;

    const clickEligible =
      !cancelClick &&
      interaction.mode === 'pressCandidate' &&
      interaction.hasPointerDown &&
      interaction.totalDistance <= leapSettings.dragActivationPx &&
      Date.now() - interaction.startedAt >= leapSettings.minPinchMsForClick;

    if (interaction.hasPointerDown) {
      injector.pointerUp(
        hand,
        x,
        y,
        interaction.target,
        interaction.mode === 'scroll' ? 2 : 0
      );
    }

    if (clickEligible) {
      injector.click(hand, x, y, interaction.target);
    }

    // Safety: ensure no pressed button state can survive release.
    injector.forceRelease(hand, x, y);

    interactionRef.current = null;
    lockHandRef.current = null;
  }, [leapSettings.dragActivationPx, leapSettings.minPinchMsForClick]);

  const forceRelease = useCallback(() => {
    const lockHand = lockHandRef.current;
    if (lockHand) {
      endInteraction(lockHand, true);
    }

    injectorRef.current.clearAll();
    interactionRef.current = null;
    lockHandRef.current = null;
    gestureEngineRef.current.reset();
  }, [endInteraction]);

  useEffect(() => {
    const handleBlur = () => {
      isFocusedRef.current = false;
      forceRelease();
    };

    const handleFocus = () => {
      isFocusedRef.current = true;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        isFocusedRef.current = false;
        forceRelease();
      } else {
        isFocusedRef.current = document.hasFocus();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [forceRelease]);

  useEffect(() => {
    setLeapEndpoint(leapSettings.endpoint);
  }, [leapSettings.endpoint, setLeapEndpoint]);

  useEffect(() => {
    window.electron.leap
      .ensureService(leapSettings.enabled)
      .catch((error) => {
        console.error('Failed to update Leap service state:', error);
      });
  }, [leapSettings.enabled]);

  useEffect(() => {
    if (!leapSettings.enabled) {
      clientRef.current?.disconnect();
      clientRef.current = null;

      forceRelease();
      latestFrameRef.current = null;
      lastProcessedFrameIdRef.current = null;
      handStateRef.current = {};
      cursorMapRef.current = {};

      setLeapStatus('disabled', null);
      setTrackedHands(0, null);
      document.body.classList.remove('leap-hide-native-cursor');

      return;
    }

    const client = new LeapWebSocketClient(
      {
        endpoint: leapSettings.endpoint,
        reconnectMs: leapSettings.reconnectMs,
      },
      {
        onStatus: (status, error) => {
          setLeapStatus(status, error ?? null);
        },
        onFrame: (frame) => {
          latestFrameRef.current = frame;
        },
      }
    );

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [
    leapSettings.enabled,
    leapSettings.endpoint,
    leapSettings.reconnectMs,
    forceRelease,
    setLeapStatus,
    setTrackedHands,
  ]);

  useEffect(() => {
    if (!leapSettings.enabled) {
      return;
    }

    const tick = () => {
      const now = Date.now();
      const frame = latestFrameRef.current;

      if (frame && frame.id !== lastProcessedFrameIdRef.current) {
        lastProcessedFrameIdRef.current = frame.id;

        const mapped = mapHandsToCursors(frame.hands, {
          width: window.innerWidth,
          height: window.innerHeight,
          smoothing: leapSettings.smoothing,
          deadzonePx: leapSettings.deadzonePx,
          edgePaddingPx: leapSettings.edgePaddingPx,
          xMinMm: leapSettings.xMinMm,
          xMaxMm: leapSettings.xMaxMm,
          yMinMm: leapSettings.yMinMm,
          yMaxMm: leapSettings.yMaxMm,
          invertX: leapSettings.invertX,
          invertY: leapSettings.invertY,
          cursorGainX: leapSettings.cursorGainX,
          cursorGainY: leapSettings.cursorGainY,
        }, cursorMapRef.current);

        cursorMapRef.current = {
          ...cursorMapRef.current,
          ...mapped,
        };

        for (const hand of frame.hands) {
          if (hand.confidence < leapSettings.confidenceThreshold) {
            continue;
          }

          const cursor = mapped[hand.chirality];
          if (!cursor) continue;

          handStateRef.current[hand.chirality] = {
            cursor,
            pinchStrength: hand.pinchStrength,
            lastSeenAt: now,
          };
        }
      }

      const pinchByHand: Partial<Record<HandChirality, number>> = {};
      const nextCursors: CursorState[] = [];
      let trackedCount = 0;

      for (const hand of HANDS) {
        const state = handStateRef.current[hand];
        const isTracked = Boolean(
          state && now - state.lastSeenAt <= leapSettings.staleHandMs && state.cursor
        );

        if (isTracked && state?.cursor) {
          trackedCount += 1;
          pinchByHand[hand] = state.pinchStrength;

          nextCursors.push({
            chirality: hand,
            x: state.cursor.x,
            y: state.cursor.y,
            pinchStrength: state.pinchStrength,
            isPinching: false,
            isTracked: true,
          });
        } else {
          pinchByHand[hand] = 0;
        }
      }

      const transitions = gestureEngineRef.current.updatePinchTransitions(pinchByHand, {
        pinchThreshold: leapSettings.pinchThreshold,
        releaseThreshold: leapSettings.releaseThreshold,
      });
      const anyPinching = transitions.some((transition) => transition.isPinching);

      if (!anyPinching && !interactionRef.current && injectorRef.current.hasPressedButtons()) {
        injectorRef.current.clearAll();
      }

      for (const cursor of nextCursors) {
        const transition = transitions.find((item) => item.hand === cursor.chirality);
        if (transition) {
          cursor.isPinching = transition.isPinching;
        }
      }

      setCursors(nextCursors);
      setTrackedHands(trackedCount, trackedCount > 0 ? now : null);

      const shouldHideCursor =
        leapSettings.enabled &&
        leapSettings.hideNativeCursor &&
        trackedCount > 0 &&
        isFocusedRef.current;
      document.body.classList.toggle('leap-hide-native-cursor', shouldHideCursor);

      const lockHand = lockHandRef.current;
      const transitionByHand = Object.fromEntries(
        transitions.map((transition) => [transition.hand, transition])
      ) as Record<HandChirality, (typeof transitions)[number]>;

      if (lockHand) {
        const lockState = handStateRef.current[lockHand];
        const lockTracked = Boolean(
          lockState && now - lockState.lastSeenAt <= leapSettings.staleHandMs && lockState.cursor
        );
        const lockTransition = transitionByHand[lockHand];
        if (!lockTransition.isPinching) {
          endInteraction(lockHand, !lockTracked);
        }
      }

      if (!lockHandRef.current) {
        const started = transitions.find((transition) => transition.started);
        if (started) {
          lockHandRef.current = started.hand;
          beginInteraction(started.hand);
        }
      }

      const activeHand = lockHandRef.current;
      if (activeHand) {
        const transition = transitionByHand[activeHand];
        const interaction = interactionRef.current;
        const state = handStateRef.current[activeHand];

        if (!state?.cursor || !transition.isPinching || !interaction) {
          endInteraction(activeHand, true);
        } else if (isFocusedRef.current) {
          const cursor = state.cursor;
          const dx = cursor.x - interaction.lastX;
          const dy = cursor.y - interaction.lastY;

          interaction.totalDistance += distance(interaction.lastX, interaction.lastY, cursor.x, cursor.y);
          interaction.lastX = cursor.x;
          interaction.lastY = cursor.y;

          if (interaction.mode === 'drag') {
            injectorRef.current.pointerMove(activeHand, cursor.x, cursor.y, true);
          } else if (interaction.mode === 'pressCandidate') {
            const moveThreshold = leapSettings.scrollActivationPx;
            const isDirectManipTarget = GestureEngine.isDirectManipulationTarget(interaction.target);
            const canUseScrollFallback = isDirectManipTarget
              ? false
              : leapSettings.scrollFallbackMode === 'always'
                ? true
                : leapSettings.scrollFallbackMode === 'never'
                  ? false
                  : GestureEngine.shouldUseScrollFallback(interaction.target);
            const pinchHeldLongEnough = now - interaction.startedAt >= leapSettings.scrollHoldDelayMs;
            const shouldScroll =
              interaction.totalDistance >= moveThreshold &&
              pinchHeldLongEnough &&
              canUseScrollFallback;

            if (shouldScroll) {
              if (interaction.hasPointerDown) {
                injectorRef.current.pointerUp(
                  activeHand,
                  cursor.x,
                  cursor.y,
                  interaction.target,
                  0
                );
              }
              const rightDownTarget = injectorRef.current.pointerDown(
                activeHand,
                cursor.x,
                cursor.y,
                interaction.target,
                2
              );
              interaction.target = rightDownTarget ?? interaction.target;
              interaction.hasPointerDown = Boolean(rightDownTarget);
              interaction.mode = 'scroll';
              window.getSelection()?.removeAllRanges();
            } else {
              injectorRef.current.pointerMove(activeHand, cursor.x, cursor.y, interaction.hasPointerDown);
            }
          }

          if (interaction.mode === 'scroll') {
            window.getSelection()?.removeAllRanges();
            let wheelDeltaX = dx * leapSettings.scrollSensitivity * leapSettings.scrollSensitivityX;
            let wheelDeltaY = dy * leapSettings.scrollSensitivity * leapSettings.scrollSensitivityY;

            if (leapSettings.invertScrollX) {
              wheelDeltaX *= -1;
            }
            if (leapSettings.invertScrollY) {
              wheelDeltaY *= -1;
            }
            if (leapSettings.scrollAxisMode === 'vertical') {
              wheelDeltaX = 0;
            } else if (leapSettings.scrollAxisMode === 'horizontal') {
              wheelDeltaY = 0;
            }

            injectorRef.current.wheel(
              activeHand,
              cursor.x,
              cursor.y,
              wheelDeltaX,
              wheelDeltaY
            );
          }

        }
      } else if (isFocusedRef.current) {
        const hoverHand = chooseHoverHand(
          handStateRef.current,
          now,
          leapSettings.staleHandMs,
          leapSettings.hoverPrimaryHand
        );
        const hoverIntervalMs = 1000 / Math.max(1, leapSettings.hoverMoveHz);
        if (hoverHand && now - lastHoverMoveRef.current >= hoverIntervalMs) {
          const state = handStateRef.current[hoverHand];
          if (state?.cursor) {
            injectorRef.current.pointerMove(hoverHand, state.cursor.x, state.cursor.y, false);
            lastHoverMoveRef.current = now;
          }
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      forceRelease();
      document.body.classList.remove('leap-hide-native-cursor');
    };
  }, [
    beginInteraction,
    endInteraction,
    forceRelease,
    leapSettings.enabled,
    leapSettings.confidenceThreshold,
    leapSettings.cursorGainX,
    leapSettings.cursorGainY,
    leapSettings.deadzonePx,
    leapSettings.edgePaddingPx,
    leapSettings.hideNativeCursor,
    leapSettings.hoverMoveHz,
    leapSettings.hoverPrimaryHand,
    leapSettings.invertScrollX,
    leapSettings.invertScrollY,
    leapSettings.invertX,
    leapSettings.invertY,
    leapSettings.scrollAxisMode,
    leapSettings.scrollFallbackMode,
    leapSettings.scrollHoldDelayMs,
    leapSettings.pinchThreshold,
    leapSettings.releaseThreshold,
    leapSettings.scrollActivationPx,
    leapSettings.scrollSensitivity,
    leapSettings.scrollSensitivityX,
    leapSettings.scrollSensitivityY,
    leapSettings.smoothing,
    leapSettings.staleHandMs,
    leapSettings.xMaxMm,
    leapSettings.xMinMm,
    leapSettings.yMaxMm,
    leapSettings.yMinMm,
    setTrackedHands,
  ]);

  const visibleCursors = connectionStatus === 'connected' ? cursors : [];

  return (
    <LeapOverlay
      cursors={visibleCursors}
      showCrosshairs={leapSettings.enabled && leapSettings.showCrosshairs}
      crosshairStyle={leapSettings.crosshairStyle}
    />
  );
}
