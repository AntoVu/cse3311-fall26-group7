import { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { BuildingFootprint } from '@/components/map/building-footprint';
import { LotFootprint } from '@/components/map/lot-footprint';
import { PoiMarker } from '@/components/map/poi-marker';
import { StreetLine } from '@/components/map/street-line';
import { projectCoordinate, projectPath } from '@/components/map/projection';
import { CAMPUS_VIEWBOX } from '@/constants/campus';
import { useTheme } from '@/hooks/use-theme';
import { CAMPUS_LOTS } from '@/mocks/campus-lots';
import { CAMPUS_STREETS } from '@/mocks/campus-streets';
import type { CampusLot, PointOfInterest } from '@/types/map';

// Scale is relative to the "cover" baseline computed below (1 == the default
// fill-the-screen view). MIN_SCALE < 1 lets users pinch out past that default
// to see more of the campus box at once; it's not 0 because letting the
// rendered map shrink much further than this makes it unreadable and mostly
// empty-margin, which reads as "the map disappeared" rather than "zoomed out."
const MIN_SCALE = 0.6;
const MAX_SCALE = 4;
// Presses arriving within this long after a pan/pinch ends are treated as the
// finger lifting off the map, not a deliberate tap on a building.
const TAP_AFTER_GESTURE_MS = 250;

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
  /** Omit to make buildings non-interactive (e.g. the Parking tab). */
  onSelectPoi?: (poi: PointOfInterest) => void;
  /** Gray out buildings and their labels so parking lots are the focus. */
  mutedBuildings?: boolean;
  /**
   * Highlight colour per parking lot. Return undefined (or omit the prop) for
   * the neutral gray lot look. The Parking tab uses this to colour lots by permit.
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

  // Lifting a finger at the end of a drag makes react-native-svg fire onPress
  // on whatever shape is underneath. Track (on the JS side) whether a pan or
  // pinch is/was just active and swallow presses during and right after it, so
  // only a real tap opens a building. The short trailing window covers the
  // press arriving before or after the gesture's end callback.
  const gestureActiveRef = useRef(false);
  const lastGestureEndRef = useRef(0);
  const markGestureStart = () => {
    gestureActiveRef.current = true;
  };
  const markGestureEnd = () => {
    gestureActiveRef.current = false;
    lastGestureEndRef.current = Date.now();
  };
  const handlePoiPress = (poi: PointOfInterest) => {
    if (gestureActiveRef.current || Date.now() - lastGestureEndRef.current < TAP_AFTER_GESTURE_MS) {
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
      scheduleOnRN(markGestureStart);
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
      scheduleOnRN(markGestureEnd);
    });

  // Zoom about the point between the fingers, not the view's center. The map
  // is drawn as: screen = center + translate + scale * (p - center). We keep
  // the map point that was under the fingers' midpoint when the pinch began
  // pinned under the *current* midpoint, which gives focal zoom and (as the
  // midpoint drifts) two-finger pan for free. Then clamp zoom to
  // [MIN_SCALE, MAX_SCALE] and the offset so the map can't leave the screen.
  // Focal coordinates are in the un-transformed container's space because the
  // GestureDetector wraps a static view (see render), not the moving one.
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      pinchStartFocalX.value = event.focalX;
      pinchStartFocalY.value = event.focalY;
      pinchReleased.value = false;
      scheduleOnRN(markGestureStart);
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

      const nextScale = Math.min(Math.max(savedScale.value * event.scale, MIN_SCALE), MAX_SCALE);
      const ratio = nextScale / savedScale.value;
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;

      const nextTranslateX =
        event.focalX -
        centerX -
        ratio * (pinchStartFocalX.value - centerX - savedTranslateX.value);
      const nextTranslateY =
        event.focalY -
        centerY -
        ratio * (pinchStartFocalY.value - centerY - savedTranslateY.value);

      scale.value = nextScale;
      const { x: maxTranslateX, y: maxTranslateY } = getMaxTranslate(
        nextScale,
        baseWidth,
        baseHeight,
        containerWidth,
        containerHeight
      );
      translateX.value = Math.min(Math.max(nextTranslateX, -maxTranslateX), maxTranslateX);
      translateY.value = Math.min(Math.max(nextTranslateY, -maxTranslateY), maxTranslateY);
    })
    .onEnd(() => {
      scheduleOnRN(markGestureEnd);
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
