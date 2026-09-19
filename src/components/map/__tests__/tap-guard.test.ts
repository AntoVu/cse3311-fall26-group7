import { createTapGuard, TAP_AFTER_GESTURE_MS } from '@/components/map/tap-guard';

function setup() {
  let time = 1_000_000;
  const guard = createTapGuard(() => time);
  return {
    guard,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('createTapGuard', () => {
  it('lets a tap through when no gesture has happened', () => {
    const { guard } = setup();
    expect(guard.shouldSuppressPress()).toBe(false);
  });

  it('suppresses presses while a pan or pinch is active', () => {
    const { guard, advance } = setup();
    guard.gestureStarted();
    advance(5_000); // a long drag: still suppressed however long it lasts
    expect(guard.shouldSuppressPress()).toBe(true);
  });

  it('suppresses the press that arrives right as a gesture ends', () => {
    const { guard, advance } = setup();
    guard.gestureStarted();
    guard.gestureEnded();
    advance(TAP_AFTER_GESTURE_MS - 1);
    expect(guard.shouldSuppressPress()).toBe(true);
  });

  it('lets a deliberate tap through once the trailing window has passed', () => {
    const { guard, advance } = setup();
    guard.gestureStarted();
    guard.gestureEnded();
    advance(TAP_AFTER_GESTURE_MS);
    expect(guard.shouldSuppressPress()).toBe(false);
  });

  it('restarts the window after each new gesture', () => {
    const { guard, advance } = setup();
    guard.gestureStarted();
    guard.gestureEnded();
    advance(TAP_AFTER_GESTURE_MS + 100);
    guard.gestureStarted();
    guard.gestureEnded();
    advance(TAP_AFTER_GESTURE_MS - 1);
    expect(guard.shouldSuppressPress()).toBe(true);
  });
});
