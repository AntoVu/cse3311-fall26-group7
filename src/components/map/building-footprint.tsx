import { Polygon } from 'react-native-svg';

import { POI_CATEGORY_COLORS } from '@/components/map/poi-marker';
import type { PointOfInterest } from '@/types/map';

type BuildingFootprintProps = {
  poi: PointOfInterest;
  /** Footprint coordinates already projected to SVG points (see CampusMapView). */
  points: { x: number; y: number }[];
  onPress: (poi: PointOfInterest) => void;
};

// Renders a building's real outline (digitized from the official campus map)
// tinted by category, underneath the PoiMarker dot/label. Tapping the shape
// itself opens the same info sheet as tapping the marker.
export function BuildingFootprint({ poi, points, onPress }: BuildingFootprintProps) {
  if (points.length < 3) {
    return null;
  }

  const color = POI_CATEGORY_COLORS[poi.category];
  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Polygon
      points={pointsAttr}
      fill={color}
      fillOpacity={0.22}
      stroke={color}
      strokeWidth={1.5}
      onPress={() => onPress(poi)}
    />
  );
}
