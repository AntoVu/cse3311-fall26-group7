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
  /** Gray label (and dot) instead of category colors -- de-emphasized, e.g. the Parking tab. */
  muted?: boolean;
  /**
   * Whether to draw the category-colored dot. CampusMapView passes false when the POI has a
   * footprint: at this box's building sizes a visible dot is bigger than the building it sits
   * on. POIs with only a coordinate still need it as their one marker.
   */
  showDot?: boolean;
};

// Labels use `abbreviation` ("NH", "ERB") because full names overlap at this building density.
// Buildings without one fall back to the full name in a smaller font.
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
