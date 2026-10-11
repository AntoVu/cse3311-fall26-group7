import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { computeFocalZoom, getMaxTranslate } from '@/components/map/map-geometry';
import type { MapTransform } from '@/components/map/map-viewport';

type PanZoomOptions = {
  /** The drawing's size at scale 1, and its container's, in pixels. */
  baseWidth: number;
  baseHeight: number;
  containerWidth: number;
  containerHeight: number;
  /** Zoom limits; the campus map's when left out. */
  minScale?: number;
  maxScale?: number;
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

  // One finger pans. Two-finger movement is handled by the pinch gesture
  // below (it tracks the fingers' midpoint), so pan must not also react to it
  // or the two would fight over translateX/Y.
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(4)
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
        containerHeight
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
    .onEnd(() => {
      scheduleOnRN(onGestureEnd, scale.value, translateX.value, translateY.value);
    });

  // Zoom about the point between the fingers (math in map-geometry.ts).
  const pinchGesture = Gesture.Pinch()
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
  const applyTransform = (next: MapTransform) => {
    scale.value = next.scale;
    savedScale.value = next.scale;
    translateX.value = next.translateX;
    translateY.value = next.translateY;
    savedTranslateX.value = next.translateX;
    savedTranslateY.value = next.translateY;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return { panGesture, pinchGesture, animatedStyle, applyTransform, scale, translateX, translateY };
}
