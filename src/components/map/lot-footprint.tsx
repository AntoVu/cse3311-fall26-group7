import { G, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type LotFootprintProps = {
  label: string;
  /**
   * Every outline of the lot, already projected to SVG points (see CampusMapView). A lot the
   * PATS map treats as one can be several polygons; they share the color and one label.
   */
  outlines: { x: number; y: number }[][];
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
export function LotFootprint({ label, outlines, center, color }: LotFootprintProps) {
  const theme = useTheme();

  const drawable = outlines.filter((points) => points.length >= 3);
  if (drawable.length === 0) {
    return null;
  }

  const shapeColor = color ?? theme.textSecondary;

  return (
    <G>
      {drawable.map((points, index) => (
        <Polygon
          key={index}
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={shapeColor}
          fillOpacity={color ? 0.5 : 0.18}
          stroke={shapeColor}
          strokeOpacity={color ? 1 : 0.5}
          strokeWidth={1}
        />
      ))}
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
