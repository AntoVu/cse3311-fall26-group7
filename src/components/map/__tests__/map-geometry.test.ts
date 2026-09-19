import {
  computeFocalZoom,
  getCoverSize,
  getMaxTranslate,
  MAX_SCALE,
  MIN_SCALE,
} from '@/components/map/map-geometry';
import { CAMPUS_VIEWBOX } from '@/constants/campus';

describe('getCoverSize', () => {
  it('keeps the viewBox aspect ratio', () => {
    const { width, height } = getCoverSize({ width: 390, height: 700 });
    expect(width / height).toBeCloseTo(CAMPUS_VIEWBOX.width / CAMPUS_VIEWBOX.height);
  });

  it('is never smaller than the container in either axis (it "covers" it)', () => {
    for (const container of [
      { width: 390, height: 700 }, // portrait phone
      { width: 1200, height: 500 }, // wide desktop window
      { width: 500, height: 500 },
    ]) {
      const { width, height } = getCoverSize(container);
      expect(width).toBeGreaterThanOrEqual(container.width - 1e-9);
      expect(height).toBeGreaterThanOrEqual(container.height - 1e-9);
    }
  });
});

describe('getMaxTranslate', () => {
  it('allows half of the overflow in each direction', () => {
    // 1000x800 map at 2x in a 400x400 window overflows by 1600 and 1200.
    expect(getMaxTranslate(2, 1000, 800, 400, 400)).toEqual({ x: 800, y: 600 });
  });

  it('is zero when the scaled map fits inside the container (stays centred)', () => {
    expect(getMaxTranslate(0.6, 1000, 800, 1000, 800)).toEqual({ x: 0, y: 0 });
  });
});

describe('computeFocalZoom', () => {
  const container = { containerWidth: 400, containerHeight: 700 };
  const base = { baseWidth: 933, baseHeight: 700 };
  const start = {
    savedScale: 1,
    savedTranslateX: 0,
    savedTranslateY: 0,
    startFocalX: 300,
    startFocalY: 200,
    focalX: 300,
    focalY: 200,
    pinchScale: 1,
    ...base,
    ...container,
  };

  it('does nothing when the fingers have not moved', () => {
    const result = computeFocalZoom(start);
    expect(result.scale).toBe(1);
    expect(result.translateX).toBeCloseTo(0);
    expect(result.translateY).toBeCloseTo(0);
  });

  it('keeps the map point under the fingers pinned while zooming in (the original bug: zoom toward the left edge)', () => {
    const scale = 2;
    const result = computeFocalZoom({ ...start, pinchScale: scale });
    // Screen position of a map point p: center + translate + scale * (p - center).
    // The point that started under the focal must still be under it afterwards.
    const centerX = container.containerWidth / 2;
    const centerY = container.containerHeight / 2;
    const mapPointX = (start.startFocalX - centerX - start.savedTranslateX) / 1 + centerX;
    const mapPointY = (start.startFocalY - centerY - start.savedTranslateY) / 1 + centerY;
    const screenX = centerX + result.translateX + result.scale * (mapPointX - centerX);
    const screenY = centerY + result.translateY + result.scale * (mapPointY - centerY);
    expect(screenX).toBeCloseTo(start.focalX);
    expect(screenY).toBeCloseTo(start.focalY);
  });

  it('follows a drifting midpoint as a two-finger pan', () => {
    // Zoom stays 1x, so the map can only move as far as its overflow allows (233/2 px horizontally).
    const result = computeFocalZoom({ ...start, focalX: 260 }); // fingers slid 40px left
    expect(result.scale).toBe(1);
    expect(result.translateX).toBeCloseTo(-40);
  });

  it('clamps zoom to MAX_SCALE and MIN_SCALE', () => {
    expect(computeFocalZoom({ ...start, pinchScale: 100 }).scale).toBe(MAX_SCALE);
    expect(computeFocalZoom({ ...start, pinchScale: 0.001 }).scale).toBe(MIN_SCALE);
  });

  it('never lets the map be dragged past its edge', () => {
    const result = computeFocalZoom({ ...start, focalX: -5000, focalY: 5000 });
    const max = getMaxTranslate(result.scale, base.baseWidth, base.baseHeight, 400, 700);
    expect(result.translateX).toBeGreaterThanOrEqual(-max.x);
    expect(result.translateX).toBeLessThanOrEqual(max.x);
    expect(result.translateY).toBeGreaterThanOrEqual(-max.y);
    expect(result.translateY).toBeLessThanOrEqual(max.y);
  });
});
