import { G, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type LotFootprintProps = {
  label: string;
  /** Footprint coordinates already projected to SVG points (see CampusMapView). */
  points: { x: number; y: number }[];
  /** Projected centroid, for the label. */
  center: { x: number; y: number };
};

// Parking lots/garages are drawn as plain neutral shapes with their map code
// as a label — visual ground-truth only, not tappable. The interactive
// parking data lives in the Parking tab (src/mocks/parking.ts); see the
// comment on CAMPUS_LOTS for why the two aren't wired together yet.
export function LotFootprint({ label, points, center }: LotFootprintProps) {
  const theme = useTheme();

  if (points.length < 3) {
    return null;
  }

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <G>
      <Polygon
        points={pointsAttr}
        fill={theme.textSecondary}
        fillOpacity={0.18}
        stroke={theme.textSecondary}
        strokeOpacity={0.5}
        strokeWidth={1}
      />
      <SvgText
        x={center.x}
        y={center.y}
        fontSize={11}
        fill={theme.textSecondary}
        textAnchor="middle"
        alignmentBaseline="middle">
        {label}
      </SvgText>
    </G>
  );
}
