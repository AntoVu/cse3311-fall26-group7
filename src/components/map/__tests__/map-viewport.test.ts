import { getCoverSize, MAX_SCALE, MIN_SCALE } from '@/components/map/map-geometry';
import {
  createViewportStore,
  fitViewport,
  getContentBounds,
  transformFromViewport,
  viewportFromTransform,
} from '@/components/map/map-viewport';
import { CAMPUS_VIEWBOX } from '@/constants/campus';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';

const PHONE = { width: 390, height: 700 };
// Same width as PHONE but shorter, like the Parking tab with its chips and legend.
const PHONE_SHORT = { width: 390, height: 560 };

describe('viewport <-> transform', () => {
  it('round-trips in the same container', () => {
    const transform = { scale: 2, translateX: 120, translateY: -80 };
    const back = transformFromViewport(viewportFromTransform(transform, PHONE), PHONE);
    expect(back.scale).toBeCloseTo(transform.scale);
    expect(back.translateX).toBeCloseTo(transform.translateX);
    expect(back.translateY).toBeCloseTo(transform.translateY);
  });

  it('keeps the magnification and the center when moved to a container of another height', () => {
    const viewport = viewportFromTransform({ scale: 2, translateX: 120, translateY: -30 }, PHONE);
    const moved = transformFromViewport(viewport, PHONE_SHORT);
    const shown = viewportFromTransform(moved, PHONE_SHORT);
    expect(shown.pxPerUnit).toBeCloseTo(viewport.pxPerUnit);
    expect(shown.centerX).toBeCloseTo(viewport.centerX);
    expect(shown.centerY).toBeCloseTo(viewport.centerY);
  });

  it('clamps zoom to the allowed range', () => {
    const cover = getCoverSize(PHONE).width / CAMPUS_VIEWBOX.width;
    const tooClose = transformFromViewport({ pxPerUnit: cover * 50, centerX: 0.5, centerY: 0.5 }, PHONE);
    const tooFar = transformFromViewport({ pxPerUnit: cover * 0.01, centerX: 0.5, centerY: 0.5 }, PHONE);
    expect(tooClose.scale).toBe(MAX_SCALE);
    expect(tooFar.scale).toBe(MIN_SCALE);
  });

  it('keeps the map from being panned past its edge', () => {
    const base = getCoverSize(PHONE);
    const { scale, translateX, translateY } = transformFromViewport(
      { pxPerUnit: (2 * base.width) / CAMPUS_VIEWBOX.width, centerX: 0, centerY: 0 },
      PHONE
    );
    expect(Math.abs(translateX)).toBeLessThanOrEqual((base.width * scale - PHONE.width) / 2 + 1e-9);
    expect(Math.abs(translateY)).toBeLessThanOrEqual((base.height * scale - PHONE.height) / 2 + 1e-9);
  });
});

describe('fitViewport on the real campus data', () => {
  const bounds = getContentBounds(CAMPUS_POIS, CAMPUS_LOTS);

  it('finds bounds inside the map', () => {
    expect(bounds.minX).toBeGreaterThanOrEqual(0);
    expect(bounds.minY).toBeGreaterThanOrEqual(0);
    expect(bounds.maxX).toBeLessThanOrEqual(CAMPUS_VIEWBOX.width);
    expect(bounds.maxY).toBeLessThanOrEqual(CAMPUS_VIEWBOX.height);
  });

  it.each([
    ['phone', PHONE],
    ['shorter phone map', PHONE_SHORT],
  ])('shows all traced content inside a %s container', (_name, container) => {
    const fit = fitViewport(bounds, container);
    const { scale, translateX, translateY } = transformFromViewport(fit, container);
    const base = getCoverSize(container);
    const pxPerUnit = (scale * base.width) / CAMPUS_VIEWBOX.width;

    // Screen position of a map point: container center + translate + offset from the map center.
    const toScreenX = (x: number) =>
      container.width / 2 + translateX + (x - CAMPUS_VIEWBOX.width / 2) * pxPerUnit;
    const toScreenY = (y: number) =>
      container.height / 2 + translateY + (y - CAMPUS_VIEWBOX.height / 2) * pxPerUnit;

    expect(toScreenX(bounds.minX)).toBeGreaterThanOrEqual(0);
    expect(toScreenX(bounds.maxX)).toBeLessThanOrEqual(container.width);
    expect(toScreenY(bounds.minY)).toBeGreaterThanOrEqual(0);
    expect(toScreenY(bounds.maxY)).toBeLessThanOrEqual(container.height);
  });
});

describe('createViewportStore', () => {
  const viewport = { pxPerUnit: 1, centerX: 0.5, centerY: 0.5 };

  it('starts empty', () => {
    expect(createViewportStore().get()).toBeNull();
  });

  it('remembers the latest viewport', () => {
    const store = createViewportStore();
    store.set(viewport);
    store.set({ ...viewport, pxPerUnit: 2 });
    expect(store.get()).toEqual({ ...viewport, pxPerUnit: 2 });
  });

  it('runs init only while empty, and remembers its result', () => {
    const store = createViewportStore();
    const init = jest.fn(() => viewport);
    expect(store.getOrInit(init)).toBe(viewport);
    expect(store.getOrInit(init)).toBe(viewport);
    expect(init).toHaveBeenCalledTimes(1);
    expect(store.get()).toBe(viewport);
  });
});
