import { Circle, G, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { PoiCategory, PointOfInterest } from '@/types/map';

// Simple distinct colors per category kept plain on purpose (see MapLegend).
export const POI_CATEGORY_COLORS: Record<PoiCategory, string> = {
  academic: '#3C87F7',
  residence: '#2FB380',
  apartment: '#F2994A',
};

type PoiMarkerProps = {
  poi: PointOfInterest;
  x: number;
  y: number;
  /** Omit to make the marker non-interactive. */
  onPress?: (poi: PointOfInterest) => void;
  /** Gray label (and dot) instead of category colours -- de-emphasised, e.g. the Parking tab. */
  muted?: boolean;
  /**
   * Whether to draw the category-colored dot. Buildings that already have a
   * digitized footprint (src/components/map/building-footprint.tsx) show
   * their real outline and don't need a dot on top of it too -- with the
   * campus-core box's real (small, tightly-packed) building sizes, a dot
   * sized for visibility on its own is bigger than most of the buildings
   * themselves and buries them. CampusMapView passes `false` here whenever
   * `poi.footprint` exists; POIs with only a coordinate (no footprint yet)
   * still need the dot as their one visual marker.
   */
  showDot?: boolean;
};

// Buildings are packed too tightly in the campus-core box for full names to
// fit everywhere, so label by `abbreviation` ("NH", "ERB", ...) when there is
// one. Not every building has an official abbreviation, so those fall back to
// the full name (in a smaller font, since it's longer).
export function PoiMarker({ poi, x, y, onPress, muted = false, showDot = true }: PoiMarkerProps) {
  const theme = useTheme();
  const label = showDot ? poi.name : (poi.abbreviation ?? poi.name);
  const isFullName = label === poi.name;

  return (
    <G onPress={onPress ? () => onPress(poi) : undefined}>
      {showDot && (
        <Circle
          cx={x}
          cy={y}
          r={4}
          fill={muted ? theme.textSecondary : POI_CATEGORY_COLORS[poi.category]}
        />
      )}
      {label ? (
        <SvgText
          x={x}
          y={showDot ? y + 9 : y}
          fontSize={isFullName ? 5 : 7}
          fontWeight="600"
          fill={muted ? theme.textSecondary : theme.text}
          textAnchor="middle"
          {...(showDot ? {} : { alignmentBaseline: 'middle' as const })}>
          {label}
        </SvgText>
      ) : null}
    </G>
  );
}
