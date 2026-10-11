import { Polygon } from 'react-native-svg';

import { POI_CATEGORY_COLORS } from '@/components/map/poi-marker';
import { useTheme } from '@/hooks/use-theme';
import type { PointOfInterest } from '@/types/map';

type BuildingFootprintProps = {
  poi: PointOfInterest;
  /** Footprint coordinates already projected to SVG points (see CampusMapView). */
  points: { x: number; y: number }[];
  /** Omit to make the shape non-interactive. */
  onPress?: (poi: PointOfInterest) => void;
  /** Draw in neutral gray instead of the category color (e.g. the Parking tab). */
  muted?: boolean;
  /** A route's start or destination: drawn in that color, muted or not. */
  highlightColor?: string;
};

// Renders a building's real outline (digitized from the official campus map)
// tinted by category, underneath the PoiMarker dot/label. Tapping the shape
// itself opens the same info sheet as tapping the marker.
export function BuildingFootprint({ poi, points, onPress, muted = false, highlightColor }: BuildingFootprintProps) {
  const theme = useTheme();

  if (points.length < 3) {
    return null;
  }

  const color = highlightColor ?? (muted ? theme.textSecondary : POI_CATEGORY_COLORS[poi.category]);
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Polygon
      points={pointsAttr}
      fill={color}
      fillOpacity={highlightColor ? 0.45 : muted ? 0.18 : 0.22}
      stroke={color}
      strokeOpacity={muted && !highlightColor ? 0.6 : 1}
      strokeWidth={highlightColor ? 2.5 : muted ? 1 : 1.5}
      onPress={onPress ? () => onPress(poi) : undefined}
    />
  );
}
