import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Svg, { Polygon, Rect } from 'react-native-svg';

import { IndoorLayer } from '@/components/map/indoor-layer';
import { fitViewBox, getContentBounds } from '@/components/map/map-viewport';
import { projectPath } from '@/components/map/projection';
import { RouteOverlay } from '@/components/map/route-overlay';
import { usePanZoom } from '@/components/map/use-pan-zoom';
import { INDOOR_ROUTE_SIZES } from '@/constants/routing';
import { INDOOR_FLOOR_OUTLINES } from '@/data/campus-indoor';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinate, PointOfInterest } from '@/types/map';

/** Room around the building, in map units (about 2 m each), so its edge isn't on the screen's. */
const MARGIN = 4;
/** Opens fitted to the building (1x); pinch in to 6x, about 45 px per meter on a phone. */
const MAX_ZOOM = 6;

type IndoorMapViewProps = {
  building: PointOfInterest;
  level: string;
  /**
   * The indoor leg's line, the pieces of it on `level` (drawn solid; the rest faded), and the
   * floors its two ends are on (an end is marked only on its own floor).
   */
  route?: { path: Coordinate[]; onFloor: Coordinate[][]; startLevel?: string; endLevel?: string };
  highlightRooms?: string[];
};

/**
 * One floor of one building, drawn at the building's own scale. Same projection as the campus
 * map, but the viewBox is just the building, so it opens about 5x closer than the campus map can
 * zoom, and route sizes are scaled to match. Pinch and pan work as on the campus map
 * (usePanZoom); the view is not shared with it.
 */
export function IndoorMapView({ building, level, route, highlightRooms }: IndoorMapViewProps) {
  const theme = useTheme();
  const [container, setContainer] = useState<{ width: number; height: number } | null>(null);
  const width = container?.width ?? 1;
  const height = container?.height ?? 1;

  // The viewBox matches the container's shape, so at 1x the drawing exactly fills it.
  const { panGesture, pinchGesture, animatedStyle, applyTransform } = usePanZoom({
    baseWidth: width,
    baseHeight: height,
    containerWidth: width,
    containerHeight: height,
    minScale: 1,
    maxScale: MAX_ZOOM,
    onGestureStart: noop,
    onGestureEnd: noop,
  });

  // Back to the whole building when it or the screen changes; a new floor keeps the zoom.
  useEffect(() => {
    applyTransform({ scale: 1, translateX: 0, translateY: 0 });
    // applyTransform only writes shared values, so it is left out of the dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building.id, width, height]);

  const box = fitViewBox(getContentBounds([building], []), { width, height }, MARGIN);
  // The floor's own outline when it was traced (upper floors are often smaller), else the building's.
  const floorOutline = INDOOR_FLOOR_OUTLINES[building.id]?.[level];
  const outlines = floorOutline ? [floorOutline] : building.footprints;
  const toAttr = (points: { x: number; y: number }[]) =>
    points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        // A hidden tab lays out at 0x0; keep the last real size rather than an infinite viewBox.
        if (w > 0 && h > 0) setContainer({ width: w, height: h });
      }}>
      {container ? (
        <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
          <View style={styles.fill} collapsable={false}>
            <Animated.View style={[styles.fill, animatedStyle]}>
              <Svg width={width} height={height} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}>
                <Rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  fill={theme.backgroundElement}
                />
                {outlines.map((outline, index) => (
                  <Polygon
                    key={index}
                    points={toAttr(projectPath(outline))}
                    fill={theme.background}
                    stroke={theme.text}
                    strokeOpacity={0.5}
                    strokeWidth={0.3}
                  />
                ))}
                <IndoorLayer poiId={building.id} level={level} highlightRooms={highlightRooms} />
                {route ? (
                  <RouteOverlay
                    points={projectPath(route.path)}
                    solidPieces={route.onFloor.map(projectPath)}
                    sizes={INDOOR_ROUTE_SIZES}
                    showStart={route.startLevel === level}
                    showDestination={route.endLevel === level}
                  />
                ) : null}
              </Svg>
            </Animated.View>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

function noop() {}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
});
