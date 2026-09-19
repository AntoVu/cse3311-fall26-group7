import { CAMPUS_VIEWBOX } from '@/constants/campus';

// Scale is relative to the "cover" baseline from getCoverSize (1 == the default
// fill-the-screen view). MIN_SCALE < 1 lets users pinch out past that default
// to see more of the campus box at once; it's not 0 because letting the
// rendered map shrink much further than this makes it unreadable and mostly
// empty-margin, which reads as "the map disappeared" rather than "zoomed out."
export const MIN_SCALE = 0.6;
export const MAX_SCALE = 4;

/**
 * The pixel size to render the SVG at so it "covers" the container (fills it
 * completely, aspect-correct, like CSS `background-size: cover`) — the same
 * effect `preserveAspectRatio="slice"` gives, but as a real, explicit pixel
 * size instead of an internal SVG-level crop.
 *
 * That distinction is the whole fix for panning: `slice` with `width="100%"`
 * crops inside the SVG's own render, so the cropped part of the campus is
 * never drawn at all — no amount of panning or zooming the outer view can
 * bring it back. Sizing the SVG explicitly to this (larger-than-container)
 * box means the full campus is always drawn; it's just centered and
 * genuinely overflowing the frame, which pan/pinch can then reveal.
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
 * How far the (scaled) map can be panned before its edge would come in from
 * the container's edge — i.e. before the user would see past the map into
 * empty space. Zero when the scaled map is smaller than the container in that
 * axis (it's fully visible already, so it stays centered instead of sliding).
 *
 * MUST stay a worklet taking plain numbers: it's called from the gesture
 * callbacks in campus-map-view.tsx, which run on the native UI thread. A
 * normal JS function (or closure over component state) called from there
 * throws "Tried to synchronously call a Remote Function" and crashes on
 * iOS/Android — web has no separate UI thread, so it won't reproduce there.
 * The same rule applies to every other function in this file that the
 * gestures call.
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
