import { getCoverSize, getMaxTranslate, MAX_SCALE, MIN_SCALE } from '@/components/map/map-geometry';
import { projectPath } from '@/components/map/projection';
import { CAMPUS_VIEWBOX } from '@/constants/campus';
import type { CampusLot, PointOfInterest } from '@/types/map';

type Size = { width: number; height: number };

/** A rectangle in map (viewBox) units. */
export type MapBounds = { minX: number; maxX: number; minY: number; maxY: number };

/** The map's on-screen pan/zoom: what the gestures drive, in the container's pixels. */
export type MapTransform = { scale: number; translateX: number; translateY: number };

/**
 * A pan/zoom that does not depend on the container's size, so two maps in
 * differently sized containers (Map and Parking tabs) can show the same place.
 * `pxPerUnit` is the magnification (screen pixels per map unit); `centerX/Y`
 * is the map point at the container's center, as 0..1 fractions of the viewBox.
 */
export type MapViewport = { pxPerUnit: number; centerX: number; centerY: number };

const FIT_PADDING = 40;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Bounds of everything that has been traced (lots and building outlines), in map units. */
export function getContentBounds(pois: PointOfInterest[], lots: CampusLot[]): MapBounds {
  const points = [
    ...lots.flatMap((lot) => projectPath(lot.footprint)),
    ...pois.flatMap((poi) => projectPath(poi.footprint ?? [poi.coordinate])),
  ];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * The viewport that centers `bounds` and zooms in as far as fits the container
 * (leaving padding around the outermost shapes and their labels), within the
 * usual MIN/MAX zoom limits.
 */
export function fitViewport(bounds: MapBounds, container: Size, padding = FIT_PADDING): MapViewport {
  const cover = getCoverSize(container).width / CAMPUS_VIEWBOX.width;
  const fitPxPerUnit = Math.min(
    (container.width - padding * 2) / Math.max(bounds.maxX - bounds.minX, 1),
    (container.height - padding * 2) / Math.max(bounds.maxY - bounds.minY, 1)
  );
  return {
    pxPerUnit: clamp(fitPxPerUnit, MIN_SCALE * cover, MAX_SCALE * cover),
    centerX: (bounds.minX + bounds.maxX) / 2 / CAMPUS_VIEWBOX.width,
    centerY: (bounds.minY + bounds.maxY) / 2 / CAMPUS_VIEWBOX.height,
  };
}

/** The container-independent description of what `transform` is showing in `container`. */
export function viewportFromTransform(transform: MapTransform, container: Size): MapViewport {
  const base = getCoverSize(container);
  return {
    pxPerUnit: (transform.scale * base.width) / CAMPUS_VIEWBOX.width,
    centerX: 0.5 - transform.translateX / (transform.scale * base.width),
    centerY: 0.5 - transform.translateY / (transform.scale * base.height),
  };
}

/** The pan/zoom that shows `viewport` in `container`, kept within the map's zoom and pan limits. */
export function transformFromViewport(viewport: MapViewport, container: Size): MapTransform {
  const base = getCoverSize(container);
  const scale = clamp(
    (viewport.pxPerUnit * CAMPUS_VIEWBOX.width) / base.width,
    MIN_SCALE,
    MAX_SCALE
  );
  const max = getMaxTranslate(scale, base.width, base.height, container.width, container.height);
  return {
    scale,
    translateX: clamp(-(viewport.centerX - 0.5) * base.width * scale, -max.x, max.x),
    translateY: clamp(-(viewport.centerY - 0.5) * base.height * scale, -max.y, max.y),
  };
}

/**
 * Remembers the last viewport so every map in the app shows the same place.
 * Empty until a map first decides where to start. Plain closures (like
 * createTapGuard) so a test can make its own instance.
 */
export function createViewportStore() {
  let viewport: MapViewport | null = null;

  return {
    get() {
      return viewport;
    },
    set(next: MapViewport) {
      viewport = next;
    },
    /** The remembered viewport, or `init()`'s result (which is then remembered) if there is none yet. */
    getOrInit(init: () => MapViewport) {
      viewport ??= init();
      return viewport;
    },
  };
}

export const mapViewportStore = createViewportStore();
