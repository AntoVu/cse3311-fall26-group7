import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { BuildingFootprint } from '@/components/map/building-footprint';
import { LotFootprint } from '@/components/map/lot-footprint';
import {
  computeFocalZoom,
  getCoverSize,
  getMaxTranslate,
  MAX_SCALE,
  MIN_SCALE,
} from '@/components/map/map-geometry';
import { PoiMarker } from '@/components/map/poi-marker';
import { projectCoordinate, projectPath } from '@/components/map/projection';
import { StreetLine } from '@/components/map/street-line';
import { createTapGuard } from '@/components/map/tap-guard';
import { CAMPUS_VIEWBOX } from '@/constants/campus';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_STREETS } from '@/data/campus-streets';
import { useTheme } from '@/hooks/use-theme';
import type { CampusLot, PointOfInterest } from '@/types/map';

type CampusMapViewProps = {
  pois: PointOfInterest[];
  initialScale?: number;
  initialOffsetX?: number;
  initialOffsetY?: number;
  fitParkingLots?: boolean;
  resetKey?: number;
  /** Omit to make buildings non-interactive (e.g. the Parking tab). */
  onSelectPoi?: (poi: PointOfInterest) => void;
  /** Gray out buildings and their labels so parking lots are the focus. */
  mutedBuildings?: boolean;
  /**
   * Highlight color per parking lot. Return undefined (or omit the prop) for
   * the neutral gray lot look. The Parking tab uses this to color lots by permit.
   */
  getLotColor?: (lot: CampusLot) => string | undefined;
};

// Option B/C from the Iteration 1 plan: a hand-authored SVG campus map instead
// of a native map SDK — no API key, works in Expo Go. Coordinates are still
// real-world-shaped ({ lat, lng }) so swapping engines later doesn't require
// re-authoring the POI data (see the plan's Map Rendering Engine section).
export function CampusMapView({
  pois,
  initialScale = 1,
  initialOffsetX = 0,
  initialOffsetY = 0,
  fitParkingLots = false,
  resetKey,
  onSelectPoi,
  mutedBuildings = false,
  getLotColor,
}: CampusMapViewProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [containerSize, setContainerSize] = useState({ width: windowWidth, height: windowWidth });
  const baseSize = getCoverSize(containerSize);
  // Plain numbers (not the objects above) so the gesture worklets capture
  // simple values — see getMaxTranslate().
  const baseWidth = baseSize.width;
  const baseHeight = baseSize.height;
  const containerWidth = containerSize.width;
  const containerHeight = containerSize.height;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(initialScale);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(initialScale);
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);
  const pinchReleased = useSharedValue(false);

  // Swallows the press react-native-svg fires when a drag ends over a shape,
  // so only a real tap opens a building (see tap-guard.ts). Held in state so
  // the same guard instance lives for the component's whole life.
  const [tapGuard] = useState(createTapGuard);

  const handlePoiPress = (poi: PointOfInterest) => {
    if (tapGuard.shouldSuppressPress()) {
      return;
    }
    onSelectPoi?.(poi);
  };
  // Without a select handler, buildings aren't interactive at all.
  const poiPressHandler = onSelectPoi ? handlePoiPress : undefined;

  // One finger pans. Two-finger movement is handled by the pinch gesture
  // below (it tracks the fingers' midpoint), so pan must not also react to it
  // or the two would fight over translateX/Y.
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(4)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      scheduleOnRN(tapGuard.gestureStarted);
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
      scheduleOnRN(tapGuard.gestureEnded);
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
      scheduleOnRN(tapGuard.gestureStarted);
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
      });
      scale.value = next.scale;
      translateX.value = next.translateX;
      translateY.value = next.translateY;
    })
    .onEnd(() => {
      scheduleOnRN(tapGuard.gestureEnded);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Declared after the gestures on purpose: react-hooks/immutability rejects
  // writing a shared value in a gesture callback if an earlier effect used it.
  useEffect(() => {
  let startScale = initialScale;
  let startX = 0;
  let startY = 0;

  if (fitParkingLots && containerWidth > 0 && containerHeight > 0) {
    // Find the actual bounds of all parking-lot footprints.
    const points = CAMPUS_LOTS.flatMap((lot) =>
      projectPath(lot.footprint)
    );

    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));

    // Leave space around the outermost lots and their labels.
    const padding = 40;

    const lotWidth = ((maxX - minX) / CAMPUS_VIEWBOX.width) * baseWidth;
    const lotHeight = ((maxY - minY) / CAMPUS_VIEWBOX.height) * baseHeight;

    startScale = Math.min(
      (containerWidth - padding * 2) / lotWidth,
      (containerHeight - padding * 2) / lotHeight,
      MAX_SCALE
    );

    startScale = Math.max(MIN_SCALE, startScale);

    // Center the parking lots, not the entire campus rectangle.
    const lotCenterX = (minX + maxX) / 2;
    const lotCenterY = (minY + maxY) / 2;

    startX =
      -startScale *
      baseWidth *
      (lotCenterX / CAMPUS_VIEWBOX.width - 0.5);

    startY =
      -startScale *
      baseHeight *
      (lotCenterY / CAMPUS_VIEWBOX.height - 0.5);
  } else {
    startX = containerWidth * initialOffsetX;
    startY = containerHeight * initialOffsetY;
  }

  // Keep the starting position within the draggable limits.
  const maxTranslateX = Math.max(
    0,
    (baseWidth * startScale - containerWidth) / 2
  );

  const maxTranslateY = Math.max(
    0,
    (baseHeight * startScale - containerHeight) / 2
  );

  startX = Math.min(Math.max(startX, -maxTranslateX), maxTranslateX);
  startY = Math.min(Math.max(startY, -maxTranslateY), maxTranslateY);

  scale.value = startScale;
  savedScale.value = startScale;

  translateX.value = startX;
  translateY.value = startY;

  savedTranslateX.value = startX;
  savedTranslateY.value = startY;
}, [
  resetKey,
  fitParkingLots,
  initialScale,
  initialOffsetX,
  initialOffsetY,
  baseWidth,
  baseHeight,
  containerWidth,
  containerHeight,
  scale,
  savedScale,
  translateX,
  translateY,
  savedTranslateX,
  savedTranslateY,
]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize({ width, height });
      }}>
      {/* The detector wraps a static full-size view, with the moving map
          inside it, so gesture coordinates (focalX/Y) are container-space
          rather than the transformed map's local space. */}
      <GestureDetector gesture={composedGesture}>
        <View style={styles.gestureSurface} collapsable={false}>
        <Animated.View style={[styles.mapSurface, animatedStyle]}>
          {/* Rendered at baseSize (cover-fit, aspect-correct) instead of
              "100%"/slice — see getCoverSize()'s comment for why that's what
              makes the cropped edges of the campus reachable by panning. */}
          <Svg
            width={baseSize.width}
            height={baseSize.height}
            viewBox={`0 0 ${CAMPUS_VIEWBOX.width} ${CAMPUS_VIEWBOX.height}`}>
            <Rect
              x={0}
              y={0}
              width={CAMPUS_VIEWBOX.width}
              height={CAMPUS_VIEWBOX.height}
              fill={theme.backgroundElement}
            />
            {/* Layer order matters: streets, then lots, then building shapes,
                then POI dots/labels on top so text stays legible. */}
            {CAMPUS_STREETS.map((street) => (
              <StreetLine key={street.id} points={projectPath(street.path)} />
            ))}
            {CAMPUS_LOTS.map((lot) => (
              <LotFootprint
                key={lot.id}
                label={lot.label}
                points={projectPath(lot.footprint)}
                center={projectCoordinate(lot.coordinate)}
                color={getLotColor?.(lot)}
              />
            ))}
            {pois.map((poi) =>
              poi.footprint ? (
                <BuildingFootprint
                  key={`${poi.id}-footprint`}
                  poi={poi}
                  points={projectPath(poi.footprint)}
                  onPress={poiPressHandler}
                  muted={mutedBuildings}
                />
              ) : null
            )}
            {pois.map((poi) => {
              const { x, y } = projectCoordinate(poi.coordinate);
              return (
                <PoiMarker
                  key={poi.id}
                  poi={poi}
                  x={x}
                  y={y}
                  onPress={poiPressHandler}
                  muted={mutedBuildings}
                  showDot={!poi.footprint}
                />
              );
            })}
          </Svg>
        </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  gestureSurface: {
    flex: 1,
  },
  mapSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
