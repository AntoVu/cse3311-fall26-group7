import { G, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type LotFootprintProps = {
  label: string;
  /** Footprint coordinates already projected to SVG points (see CampusMapView). */
  points: { x: number; y: number }[];
  /** Projected centroid, for the label. */
  center: { x: number; y: number };
  /**
   * Highlight color (e.g. the Parking tab's per-permit access color). Omit for
   * the neutral gray look used on the Map tab.
   */
  color?: string;
};

// Parking lots/garages as plain shapes labeled with their map code. Not tappable yet; the
// Parking tab colors them by permit through `color`.
export function LotFootprint({ label, points, center, color }: LotFootprintProps) {
  const theme = useTheme();

  if (points.length < 3) {
    return null;
  }

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const shapeColor = color ?? theme.textSecondary;

  return (
    <G>
      <Polygon
        points={pointsAttr}
        fill={shapeColor}
        fillOpacity={color ? 0.5 : 0.18}
        stroke={shapeColor}
        strokeOpacity={color ? 1 : 0.5}
        strokeWidth={1}
      />
      <SvgText
        x={center.x}
        y={center.y}
        fontSize={6}
        fontWeight={color ? '600' : 'normal'}
        fill={color ? theme.text : theme.textSecondary}
        textAnchor="middle"
        alignmentBaseline="middle">
        {label}
      </SvgText>
    </G>
  );
}
