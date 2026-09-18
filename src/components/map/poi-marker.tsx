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
  onPress: (poi: PointOfInterest) => void;
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
// fit without overlapping (37 buildings in a few hundred feet). Labeling by
// `abbreviation` instead ("NH", "ERB", ...) is short enough to actually fit,
// and buildings without one yet just render unlabeled -- tapping still opens
// PoiInfoSheet with the full name, so nothing is unreachable, just less
// cluttered by default. Add abbreviations for more buildings via the Campus
// Digitizer tool's inline edit if more labels are wanted.
export function PoiMarker({ poi, x, y, onPress, showDot = true }: PoiMarkerProps) {
  const theme = useTheme();
  const label = showDot ? poi.name : poi.abbreviation;

  return (
    <G onPress={() => onPress(poi)}>
      {showDot && <Circle cx={x} cy={y} r={4} fill={POI_CATEGORY_COLORS[poi.category]} />}
      {label ? (
        <SvgText
          x={x}
          y={showDot ? y + 9 : y}
          fontSize={7}
          fontWeight="600"
          fill={theme.text}
          textAnchor="middle"
          {...(showDot ? {} : { alignmentBaseline: 'middle' as const })}>
          {label}
        </SvgText>
      ) : null}
    </G>
  );
}
