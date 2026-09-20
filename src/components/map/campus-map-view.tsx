import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { BuildingFootprint } from '@/components/map/building-footprint';
import { LotFootprint } from '@/components/map/lot-footprint';
import { computeFocalZoom, getCoverSize, getMaxTranslate } from '@/components/map/map-geometry';
import {
  fitViewport,
  getContentBounds,
  mapViewportStore,
  transformFromViewport,
  viewportFromTransform,
} from '@/components/map/map-viewport';
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
  onSelectPoi,
  mutedBuildings = false,
  getLotColor,
}: CampusMapViewProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [containerSize, setContainerSize] = useState({ width: windowWidth, height: windowWidth });
  // containerSize starts as a guess; the shared view must not be decided from it.
  const [hasLayout, setHasLayout] = useState(false);
  const baseSize = getCoverSize(containerSize);
  // Plain numbers (not the objects above) so the gesture worklets capture
  // simple values — see getMaxTranslate().
  const baseWidth = baseSize.width;
  const baseHeight = baseSize.height;
  const containerWidth = containerSize.width;
  const containerHeight = containerSize.height;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const pinchStartFocalX = useSharedValue(0);
  const pinchStartFocalY = useSharedValue(0);
  const pinchReleased = useSharedValue(false);

  // Swallows the press react-native-svg fires when a drag ends over a shape,
  // so only a real tap opens a building (see tap-guard.ts). Held in state so
  // the same guard instance lives for the component's whole life.
  const [tapGuard] = useState(createTapGuard);

  // Runs on the JS thread when a pan/pinch ends: closes the tap guard's window
  // and remembers where the map ended up, so the other tab's map opens there.
  const handleGestureEnd = (endScale: number, endX: number, endY: number) => {
    tapGuard.gestureEnded();
    mapViewportStore.set(
      viewportFromTransform(
        { scale: endScale, translateX: endX, translateY: endY },
        containerSize
      )
    );
  };
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
      scheduleOnRN(handleGestureEnd, scale.value, translateX.value, translateY.value);
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
      scheduleOnRN(handleGestureEnd, scale.value, translateX.value, translateY.value);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Every map shows the view remembered in mapViewportStore, so the Map and
  // Parking tabs stay on the same spot. The first map to be measured starts on
  // the traced area. Declared after the gestures on purpose:
  // react-hooks/immutability rejects writing a shared value in a gesture
  // callback if an earlier effect used it.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused || !hasLayout) {
      return;
    }
    const container = { width: containerWidth, height: containerHeight };
    const viewport = mapViewportStore.getOrInit(() =>
      fitViewport(getContentBounds(pois, CAMPUS_LOTS), container)
    );
    const next = transformFromViewport(viewport, container);

    scale.value = next.scale;
    savedScale.value = next.scale;
    translateX.value = next.translateX;
    translateY.value = next.translateY;
    savedTranslateX.value = next.translateX;
    savedTranslateY.value = next.translateY;
  }, [
    isFocused,
    hasLayout,
    containerWidth,
    containerHeight,
    pois,
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
        setHasLayout(true);
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
