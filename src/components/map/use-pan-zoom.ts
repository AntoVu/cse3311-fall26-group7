import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { computeFocalZoom, getMaxTranslate } from '@/components/map/map-geometry';
import type { MapTransform } from '@/components/map/map-viewport';

/** How long animateTransform's glide takes. */
const FLY_MS = 600;
/**
 * Letting go mid-swipe keeps the map moving and slows it to a stop, as Apple and Google Maps do.
 * Slower releases than this stop dead, so careful positioning stays put. Deceleration is
 * withDecay's per-millisecond factor: lower stops sooner.
 */
const FLING_MIN_SPEED = 200;
const FLING_DECELERATION = 0.996;

type PanZoomOptions = {
  /** The drawing's size at scale 1, and its container's, in pixels. */
  baseWidth: number;
  baseHeight: number;
  containerWidth: number;
  containerHeight: number;
  /** Zoom limits; the campus map's when left out. */
  minScale?: number;
  maxScale?: number;
  /** Pixels the drawing may be dragged past its edge; 0 when left out (see getMaxTranslate). */
  panSlack?: number;
  /** Called on the JS thread when a pan or pinch starts, and with where it ended. */
  onGestureStart: () => void;
  onGestureEnd: (scale: number, translateX: number, translateY: number) => void;
};

/**
 * One-finger pan and two-finger pinch zoom (about the fingers' midpoint) for a map drawn inside
 * a fixed container. Shared by the campus map and the indoor map. The gesture callbacks run on
 * the UI thread, so everything they call must be a worklet taking plain numbers (see
 * map-geometry.ts).
 */
export function usePanZoom({
  baseWidth,
  baseHeight,
  containerWidth,
  containerHeight,
  minScale,
  maxScale,
  panSlack = 0,
  onGestureStart,
  onGestureEnd,
}: PanZoomOptions) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);
  const pinchReleased = useSharedValue(false);
  // Axes still gliding after a fling (0 when none), so the swipe ends once, when both stop.
  const glidingAxes = useSharedValue(0);

  // A finger touching down (or a pinch) stops a glide where it is, and ends the swipe that
  // started it, so the tap guard and the saved view hear about it.
  const stopGlide = () => {
    'worklet';
    if (glidingAxes.value === 0) return;
    glidingAxes.value = 0;
    translateX.value = translateX.value;
    translateY.value = translateY.value;
    scheduleOnRN(onGestureEnd, scale.value, translateX.value, translateY.value);
  };

  // One finger pans. Two-finger movement is handled by the pinch gesture
  // below (it tracks the fingers' midpoint), so pan must not also react to it
  // or the two would fight over translateX/Y.
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(4)
    .onBegin(stopGlide)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      scheduleOnRN(onGestureStart);
    })
    .onUpdate((event) => {
      const { x: maxTranslateX, y: maxTranslateY } = getMaxTranslate(
        scale.value,
        baseWidth,
        baseHeight,
        containerWidth,
        containerHeight,
        panSlack
      );
      translateX.value = Math.min(
        Math.max(savedTranslateX.value + event.translationX, -maxTranslateX),
        maxTranslateX
      );
      translateY.value = Math.min(
        Math.max(savedTranslateY.value + event.translationY, -maxTranslateY),
        maxTranslateY
      );
    })
    .onEnd((event) => {
      if (Math.hypot(event.velocityX, event.velocityY) < FLING_MIN_SPEED) {
        scheduleOnRN(onGestureEnd, scale.value, translateX.value, translateY.value);
        return;
      }
      const { x: maxX, y: maxY } = getMaxTranslate(scale.value, baseWidth, baseHeight, containerWidth, containerHeight, panSlack);
      // The swipe ends (view saved, taps allowed) once both axes stop. A glide cut short by
      // stopGlide or a jump ends unfinished, and whatever cut it reports the end instead.
      const settled = (finished?: boolean) => {
        'worklet';
        if (!finished || glidingAxes.value === 0) return;
        glidingAxes.value -= 1;
        if (glidingAxes.value === 0) scheduleOnRN(onGestureEnd, scale.value, translateX.value, translateY.value);
      };
      const decay = { deceleration: FLING_DECELERATION };
      glidingAxes.value = 2;
      translateX.value = withDecay({ ...decay, velocity: event.velocityX, clamp: [-maxX, maxX] }, settled);
      translateY.value = withDecay({ ...decay, velocity: event.velocityY, clamp: [-maxY, maxY] }, settled);
    });

  // Zoom about the point between the fingers (math in map-geometry.ts).
  const pinchGesture = Gesture.Pinch()
    .onBegin(stopGlide)
    .onStart((event) => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      pinchStartFocalX.value = event.focalX;
      pinchStartFocalY.value = event.focalY;
      pinchReleased.value = false;
      scheduleOnRN(onGestureStart);
    })
    .onUpdate((event) => {
      // Once either finger lifts, the reported focal point jumps from the
      // midpoint to the remaining finger, which would yank the map to it.
      // Latch and ignore the rest of this pinch, so a slightly staggered
      // release just leaves the map where the two-finger gesture ended.
      if (event.numberOfPointers < 2) {
        pinchReleased.value = true;
      }
      if (pinchReleased.value) {
        return;
      }

      const next = computeFocalZoom({
        savedScale: savedScale.value,
        savedTranslateX: savedTranslateX.value,
        savedTranslateY: savedTranslateY.value,
        startFocalX: pinchStartFocalX.value,
        startFocalY: pinchStartFocalY.value,
        focalX: event.focalX,
        focalY: event.focalY,
        pinchScale: event.scale,
        baseWidth,
        baseHeight,
        containerWidth,
        containerHeight,
        minScale,
        maxScale,
        panSlack,
      });
      scale.value = next.scale;
      translateX.value = next.translateX;
      translateY.value = next.translateY;
    })
    .onEnd(() => {
      scheduleOnRN(onGestureEnd, scale.value, translateX.value, translateY.value);
    });

  /**
   * Jumps to a pan/zoom, e.g. a remembered view or back to the start. Declared before
   * useAnimatedStyle on purpose: react-hooks/immutability rejects writing a shared value after a
   * hook has captured it.
   */
  const endGlide = () => {
    if (glidingAxes.value === 0) return;
    glidingAxes.value = 0;
    onGestureEnd(scale.value, translateX.value, translateY.value);
  };
  const applyTransform = (next: MapTransform) => {
    endGlide();
    scale.value = next.scale;
    savedScale.value = next.scale;
    translateX.value = next.translateX;
    translateY.value = next.translateY;
    savedTranslateX.value = next.translateX;
    savedTranslateY.value = next.translateY;
  };

  /**
   * Glides to a pan/zoom (a search flying to a building), then calls `onDone` on the JS thread. It
   * also runs when a finger or a jump cuts the glide short, so whatever was waiting still happens.
   */
  const animateTransform = (next: MapTransform, onDone: () => void) => {
    endGlide();
    const timing = { duration: FLY_MS };
    savedScale.value = next.scale;
    savedTranslateX.value = next.translateX;
    savedTranslateY.value = next.translateY;
    scale.value = withTiming(next.scale, timing);
    translateX.value = withTiming(next.translateX, timing);
    translateY.value = withTiming(next.translateY, timing, () => scheduleOnRN(onDone));
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return { panGesture, pinchGesture, animatedStyle, applyTransform, animateTransform, scale, translateX, translateY };
}
