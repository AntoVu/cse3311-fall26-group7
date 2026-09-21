import { CAMPUS_VIEWBOX } from '@/constants/campus';

// Scale is relative to getCoverSize's baseline (1 == fills the screen). Below 1 the user can
// pinch out to see more of the campus at once; much below 0.6 it's mostly empty margin.
export const MIN_SCALE = 0.6;
export const MAX_SCALE = 4;

/**
 * The pixel size to render the SVG at so it covers the container, aspect-correct (like CSS
 * `background-size: cover`).
 *
 * Don't replace this with `preserveAspectRatio="slice"` and `width="100%"`: that crops inside
 * the SVG, so the cropped part of the campus is never drawn and panning can't reveal it.
 * Sizing the SVG explicitly larger than the container draws all of it and lets pan/pinch
 * bring the overflow into view.
 */
export function getCoverSize(containerSize: { width: number; height: number }) {
  const coverScale = Math.max(
    containerSize.width / CAMPUS_VIEWBOX.width,
    containerSize.height / CAMPUS_VIEWBOX.height
  );
  return {
    width: CAMPUS_VIEWBOX.width * coverScale,
    height: CAMPUS_VIEWBOX.height * coverScale,
  };
}

/**
 * How far the scaled map can be panned before the user would see past its edge. Zero when the
 * map is smaller than the container in that axis, so it stays centered.
 *
 * **Must stay a worklet taking plain numbers**: the gesture callbacks in campus-map-view.tsx
 * run on the native UI thread, and a normal JS function called from there crashes with "Tried
 * to synchronously call a Remote Function" on iOS/Android. Web has no separate UI thread, so
 * it won't reproduce there. Same rule for every function in this file the gestures call.
 */
export function getMaxTranslate(
  scaleValue: number,
  baseWidth: number,
  baseHeight: number,
  containerWidth: number,
  containerHeight: number
) {
  'worklet';
  return {
    x: Math.max(0, (baseWidth * scaleValue - containerWidth) / 2),
    y: Math.max(0, (baseHeight * scaleValue - containerHeight) / 2),
  };
}

export type FocalZoomInput = {
  /** Scale/translate at the moment the pinch began. */
  savedScale: number;
  savedTranslateX: number;
  savedTranslateY: number;
  /** Midpoint between the fingers when the pinch began, in container space. */
  startFocalX: number;
  startFocalY: number;
  /** Current midpoint between the fingers, in container space. */
  focalX: number;
  focalY: number;
  /** Cumulative pinch factor reported by the gesture (1 == fingers haven't moved apart/together). */
  pinchScale: number;
  baseWidth: number;
  baseHeight: number;
  containerWidth: number;
  containerHeight: number;
};

/**
 * Zoom about the point between the fingers, not the view's center. The map is
 * drawn as: screen = center + translate + scale * (p - center). We keep the
 * map point that was under the fingers' midpoint when the pinch began pinned
 * under the *current* midpoint, which gives focal zoom and (as the midpoint
 * drifts) two-finger pan for free. Then clamp zoom to [MIN_SCALE, MAX_SCALE]
 * and the offset so the map can't leave the screen.
 *
 * Focal coordinates must be in the un-transformed container's space (the
 * GestureDetector wraps a static view, not the moving one).
 */
export function computeFocalZoom(input: FocalZoomInput) {
  'worklet';
  const nextScale = Math.min(Math.max(input.savedScale * input.pinchScale, MIN_SCALE), MAX_SCALE);
  const ratio = nextScale / input.savedScale;
  const centerX = input.containerWidth / 2;
  const centerY = input.containerHeight / 2;

  const rawTranslateX =
    input.focalX -
    centerX -
    ratio * (input.startFocalX - centerX - input.savedTranslateX);
  const rawTranslateY =
    input.focalY -
    centerY -
    ratio * (input.startFocalY - centerY - input.savedTranslateY);

  const max = getMaxTranslate(
    nextScale,
    input.baseWidth,
    input.baseHeight,
    input.containerWidth,
    input.containerHeight
  );
  return {
    scale: nextScale,
    translateX: Math.min(Math.max(rawTranslateX, -max.x), max.x),
    translateY: Math.min(Math.max(rawTranslateY, -max.y), max.y),
  };
}
