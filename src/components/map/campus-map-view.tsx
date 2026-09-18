import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { BuildingFootprint } from '@/components/map/building-footprint';
import { LotFootprint } from '@/components/map/lot-footprint';
import { PoiMarker } from '@/components/map/poi-marker';
import { StreetLine } from '@/components/map/street-line';
import { CAMPUS_BOUNDS, CAMPUS_VIEWBOX } from '@/constants/campus';
import { useTheme } from '@/hooks/use-theme';
import { CAMPUS_LOTS } from '@/mocks/campus-lots';
import { CAMPUS_STREETS } from '@/mocks/campus-streets';
import type { Coordinate, PointOfInterest } from '@/types/map';

// Scale is relative to the "cover" baseline computed below (1 == the default
// fill-the-screen view). MIN_SCALE < 1 lets users pinch out past that default
// to see more of the campus box at once; it's not 0 because letting the
// rendered map shrink much further than this makes it unreadable and mostly
// empty-margin, which reads as "the map disappeared" rather than "zoomed out."
const MIN_SCALE = 0.6;
const MAX_SCALE = 4;

function projectCoordinate(coordinate: Coordinate) {
  const { minLat, maxLat, minLng, maxLng } = CAMPUS_BOUNDS;
  const x = ((coordinate.lng - minLng) / (maxLng - minLng)) * CAMPUS_VIEWBOX.width;
  const y = ((maxLat - coordinate.lat) / (maxLat - minLat)) * CAMPUS_VIEWBOX.height;
  return { x, y };
}

function projectPath(path: Coordinate[]) {
  return path.map(projectCoordinate);
}

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
function getCoverSize(containerSize: { width: number; height: number }) {
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
 * callbacks below, which run on the native UI thread. A normal JS function
 * (or closure over component state) called from there throws
 * "Tried to synchronously call a Remote Function" and crashes on iOS/Android
 * — web has no separate UI thread, so it won't reproduce there.
 */
function getMaxTranslate(
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

type CampusMapViewProps = {
  pois: PointOfInterest[];
  onSelectPoi: (poi: PointOfInterest) => void;
};

// Option B/C from the Iteration 1 plan: a hand-authored SVG campus map instead
// of a native map SDK — no API key, works in Expo Go. Coordinates are still
// real-world-shaped ({ lat, lng }) so swapping engines later doesn't require
// re-authoring the POI data (see the plan's Map Rendering Engine section).
export function CampusMapView({ pois, onSelectPoi }: CampusMapViewProps) {
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
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
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
    });

  // Clamp zoom to [MIN_SCALE, MAX_SCALE], then re-clamp the current pan offset
  // so zooming back out can't leave the map stranded off screen.
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(nextScale, MIN_SCALE), MAX_SCALE);

      const { x: maxTranslateX, y: maxTranslateY } = getMaxTranslate(
        scale.value,
        baseWidth,
        baseHeight,
        containerWidth,
        containerHeight
      );
      translateX.value = Math.min(Math.max(translateX.value, -maxTranslateX), maxTranslateX);
      translateY.value = Math.min(Math.max(translateY.value, -maxTranslateY), maxTranslateY);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

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
      <GestureDetector gesture={composedGesture}>
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
              />
            ))}
            {pois.map((poi) =>
              poi.footprint ? (
                <BuildingFootprint
                  key={`${poi.id}-footprint`}
                  poi={poi}
                  points={projectPath(poi.footprint)}
                  onPress={onSelectPoi}
                />
              ) : null
            )}
            {pois.map((poi) => {
              const { x, y } = projectCoordinate(poi.coordinate);
              return <PoiMarker key={poi.id} poi={poi} x={x} y={y} onPress={onSelectPoi} />;
            })}
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  mapSurface: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
