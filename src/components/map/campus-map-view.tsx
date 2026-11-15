import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { BuildingFootprint } from '@/components/map/building-footprint';
import { LotFootprint } from '@/components/map/lot-footprint';
import { containerPointToViewBox, getCoverSize } from '@/components/map/map-geometry';
import {
  fitViewport,
  focusViewport,
  getContentBounds,
  mapViewportStore,
  transformFromViewport,
  viewportFromTransform,
} from '@/components/map/map-viewport';
import { PoiMarker } from '@/components/map/poi-marker';
import '@/components/map/quiet-svg-responder-warning';
import { projectCoordinate, projectPath, unprojectPoint } from '@/components/map/projection';
import { RouteOverlay } from '@/components/map/route-overlay';
import { streetLabels } from '@/components/map/street-labels';
import { StreetLine } from '@/components/map/street-line';
import { UserLocationMarker } from '@/components/map/user-location-marker';
import { createTapGuard } from '@/components/map/tap-guard';
import { usePanZoom } from '@/components/map/use-pan-zoom';
import { CAMPUS_CORE_POI_IDS, CAMPUS_VIEWBOX } from '@/constants/campus';
import { ROUTE_COLORS } from '@/constants/routing';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { CAMPUS_STREETS } from '@/data/campus-streets';
import { useTheme } from '@/hooks/use-theme';
import { AMENITY_BADGE_COLOR } from '@/routing/amenities';
import type { CampusLot, Coordinate, PointOfInterest } from '@/types/map';

/** The main roads' names, faded: placed once, since the streets never change while the app runs. */
const STREET_LABELS = streetLabels(CAMPUS_STREETS);

const CAMPUS_CORE_POIS = CAMPUS_POIS.filter((poi) => CAMPUS_CORE_POI_IDS.includes(poi.id));

type CampusMapViewProps = {
  pois: PointOfInterest[];
  /** Omit to make buildings non-interactive (e.g. the Parking tab). */
  onSelectPoi?: (poi: PointOfInterest) => void;
  onSelectLot?: (lot: CampusLot) => void;
  /** Gray out buildings and their labels so parking lots are the focus. */
  mutedBuildings?: boolean;
  /**
   * Highlight color per parking lot. Return undefined (or omit the prop) for
   * the neutral gray lot look. The Parking tab uses this to color lots by permit.
   */
  getLotColor?: (lot: CampusLot) => string | undefined;
  /**
   * A walking route to draw over the map, as the line's coordinates (RoutePlan.path from
   * @/routing/route). Omit for no route.
   */
  route?: Coordinate[];
  /**
   * Called with the coordinate under a long press. The Map tab uses it to drop a pin, which
   * stands in for a GPS fix when testing away from campus.
   */
  onLongPressCoordinate?: (coordinate: Coordinate) => void;
  /** Draws a "you are here" dot. Omit to draw none. */
  userLocation?: { coordinate: Coordinate; pinned: boolean };
  /**
   * The building or lot ids (POI or lot) a route starts and ends at, lit up in the route's
   * start and destination colors. Every screen that draws a route passes this.
   */
  routeEnds?: { start?: string; destination?: string };
  /** Places busy right now (Avoid crowds), shaded amber under the route. */
  crowdZones?: { bounds: { north: number; south: number; west: number; east: number } }[];
  /** Buildings to badge with a letter, e.g. those with a vending machine while the search shows "vending". */
  badges?: { poiIds: string[]; glyph: string };
  /** A building to glide to (the Map tab's search); `onFlyEnd` runs when it gets there. */
  flyTo?: PointOfInterest | null;
  onFlyEnd?: () => void;
};

// A hand-authored SVG campus map rather than a native map SDK: no API key, works in Expo Go.
// Coordinates stay real-world-shaped ({ lat, lng }) so a later engine swap doesn't mean
// re-authoring the data. Shared by the Map and Parking tabs: extend the props rather than
// copying this, so a fix lands in both.
export function CampusMapView({
  pois,
  onSelectPoi,
  onSelectLot,
  mutedBuildings = false,
  getLotColor,
  route,
  onLongPressCoordinate,
  userLocation,
  routeEnds,
  crowdZones,
  flyTo,
  onFlyEnd,
  badges,
}: CampusMapViewProps) {
  const theme = useTheme();
  const endColor = (id: string) =>
    id === routeEnds?.destination ? ROUTE_COLORS.destination : id === routeEnds?.start ? ROUTE_COLORS.start : undefined;
  const { width: windowWidth } = useWindowDimensions();
  const [containerSize, setContainerSize] = useState({ width: windowWidth, height: windowWidth });
  // containerSize starts as a guess; the shared view must not be decided from it.
  const [hasLayout, setHasLayout] = useState(false);
  const baseSize = getCoverSize(containerSize);
  // Plain numbers (not the objects above) so the gesture worklets capture
  // simple values: see getMaxTranslate().
  const baseWidth = baseSize.width;
  const baseHeight = baseSize.height;
  const containerWidth = containerSize.width;
  const containerHeight = containerSize.height;

  // Swallows the press react-native-svg fires when a drag ends over a shape (see tap-guard.ts).
  // In state so one guard instance lives for the component's whole life.
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
  const handleLotPress = (lot: CampusLot) => {
  if (tapGuard.shouldSuppressPress()) {
    return;
  }

  onSelectLot?.(lot);
};
  // Without a select handler, buildings aren't interactive at all.
  const poiPressHandler = onSelectPoi ? handlePoiPress : undefined;
  const lotPressHandler = onSelectLot ? handleLotPress : undefined;

  const { panGesture, pinchGesture, animatedStyle, applyTransform, animateTransform, scale, translateX, translateY } =
    usePanZoom({
      baseWidth,
      baseHeight,
      containerWidth,
      containerHeight,
      onGestureStart: tapGuard.gestureStarted,
      onGestureEnd: handleGestureEnd,
    });

  // Long press drops a pin wherever the finger was. It runs through the same tap guard as a
  // building press, so finishing a pan with a pause does not also drop one.
  const handleLongPress = (x: number, y: number) => {
    if (tapGuard.shouldSuppressPress()) return;
    onLongPressCoordinate?.(unprojectPoint({ x, y }));
  };

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .maxDistance(12)
    .onStart((event) => {
      const point = containerPointToViewBox({
        x: event.x,
        y: event.y,
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
        baseWidth,
        baseHeight,
        containerWidth,
        containerHeight,
      });
      scheduleOnRN(handleLongPress, point.x, point.y);
    });

  const composedGesture = onLongPressCoordinate
    ? Gesture.Simultaneous(panGesture, pinchGesture, longPressGesture)
    : Gesture.Simultaneous(panGesture, pinchGesture);

  // Every map shows the view remembered in mapViewportStore, so the Map and
  // Parking tabs stay on the same spot. The first map to be measured starts on
  // the core of campus (CAMPUS_CORE_POI_IDS). Declared after the gestures on purpose:
  // react-hooks/immutability rejects writing a shared value in a gesture
  // callback if an earlier effect used it.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused || !hasLayout) {
      return;
    }
    const container = { width: containerWidth, height: containerHeight };
    const viewport = mapViewportStore.getOrInit(() =>
      fitViewport(getContentBounds(CAMPUS_CORE_POIS, []), container)
    );
    applyTransform(transformFromViewport(viewport, container));
    // applyTransform only writes shared values, so it is left out of the dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, hasLayout, containerWidth, containerHeight]);

  // Glide to a searched building. The destination is saved before the glide starts, so if the
  // view resizes on the way (iOS closing the keyboard) the effect above lands there too, and the
  // other tab's map opens there.
  useEffect(() => {
    if (!flyTo || !isFocused || !hasLayout) return;
    const container = { width: containerWidth, height: containerHeight };
    const target = transformFromViewport(focusViewport(flyTo, mapViewportStore.get(), container), container);
    mapViewportStore.set(viewportFromTransform(target, container));
    animateTransform(target, () => onFlyEnd?.());
    // Only a new building starts a glide; the rest are read as they are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo]);

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
              "100%"/slice: see getCoverSize()'s comment for why that's what
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
                outlines={lot.footprints.map(projectPath)}
                center={projectCoordinate(lot.coordinate)}
                color={getLotColor?.(lot)}
                highlightColor={endColor(lot.id)}
                onPress={lotPressHandler ? () => lotPressHandler(lot) : undefined}
              />
            ))}
            {/* A building drawn as several outlines is still one POI: every outline opens it. */}
            {pois.flatMap((poi) =>
              poi.footprints.map((outline, index) => (
                <BuildingFootprint
                  key={`${poi.id}-footprint-${index}`}
                  poi={poi}
                  points={projectPath(outline)}
                  onPress={poiPressHandler}
                  muted={mutedBuildings}
                  highlightColor={endColor(poi.id)}
                />
              ))
            )}
            {/* Above the shapes (a lot can cover its street), below everything that matters more. */}
            {STREET_LABELS.map((label) => (
              <SvgText
                key={label.key}
                x={label.x}
                y={label.y}
                transform={`rotate(${label.angle} ${label.x} ${label.y})`}
                fontSize={4.5}
                fontWeight="600"
                fill={theme.textSecondary}
                fillOpacity={0.7}
                textAnchor="middle"
                alignmentBaseline="central">
                {label.text}
              </SvgText>
            ))}
            {/* Above the shapes so the route is never hidden by a building, but below the
                POI labels so the names stay readable. */}
            {crowdZones?.map(({ bounds }) => {
              const nw = projectCoordinate({ lat: bounds.north, lng: bounds.west });
              const se = projectCoordinate({ lat: bounds.south, lng: bounds.east });
              return (
                <Rect
                  key={`${bounds.north},${bounds.west}`}
                  x={nw.x}
                  y={nw.y}
                  width={se.x - nw.x}
                  height={se.y - nw.y}
                  fill={ROUTE_COLORS.crowd}
                  fillOpacity={0.25}
                  stroke={ROUTE_COLORS.crowd}
                  strokeWidth={1.5}
                />
              );
            })}
            {route ? <RouteOverlay points={projectPath(route)} /> : null}
            {userLocation
              ? (() => {
                  const { x, y } = projectCoordinate(userLocation.coordinate);
                  return <UserLocationMarker x={x} y={y} pinned={userLocation.pinned} />;
                })()
              : null}
            {pois.map((poi) => {
              const { x, y } = projectCoordinate(poi.coordinate);
              return (
                <PoiMarker
                  key={poi.id}
                  poi={poi}
                  x={x}
                  y={y}
                  onPress={poiPressHandler}
                  muted={mutedBuildings && !endColor(poi.id)}
                  showDot={poi.footprints.length === 0}
                />
              );
            })}
            {/* Above the labels, at each building's upper right, in the report marker's orange. */}
            {badges?.poiIds.map((poiId) => {
              const poi = pois.find((candidate) => candidate.id === poiId);
              if (!poi) return null;
              const { x, y } = projectCoordinate(poi.coordinate);
              return (
                <G key={poiId} testID={`badge-${poiId}`}>
                  <Circle cx={x + 8} cy={y - 7} r={4.5} fill={AMENITY_BADGE_COLOR} stroke="#ffffff" strokeWidth={0.8} />
                  <SvgText
                    x={x + 8}
                    y={y - 7}
                    fontSize={badges.glyph.length > 1 ? 3.6 : 5}
                    fontWeight="700"
                    fill="#ffffff"
                    textAnchor="middle"
                    alignmentBaseline="central">
                    {badges.glyph}
                  </SvgText>
                </G>
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
