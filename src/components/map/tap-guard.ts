// Presses arriving within this long after a pan/pinch ends are treated as the
// finger lifting off the map, not a deliberate tap on a building.
export const TAP_AFTER_GESTURE_MS = 250;

/**
 * Lifting a finger at the end of a drag makes react-native-svg fire onPress on
 * whatever shape is underneath. The map calls gestureStarted()/gestureEnded()
 * from its pan and pinch gestures and asks shouldSuppressPress() before
 * treating a press as a real tap: presses are swallowed during a gesture and
 * for a short window after. The trailing window covers the press arriving
 * before or after the gesture's end callback.
 *
 * Plain closures (no `this`) so the methods can be handed straight to
 * scheduleOnRN from gesture worklets. `now` is injectable for tests.
 */
export function createTapGuard(now: () => number = Date.now, windowMs = TAP_AFTER_GESTURE_MS) {
  let active = false;
  let lastEnd = Number.NEGATIVE_INFINITY;

  return {
    gestureStarted() {
      active = true;
    },
    gestureEnded() {
      active = false;
      lastEnd = now();
    },
    shouldSuppressPress() {
      return active || now() - lastEnd < windowMs;
    },
  };
}
