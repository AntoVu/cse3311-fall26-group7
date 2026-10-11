import { G, Polygon, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type LotFootprintProps = {
  label: string;
  /**
   * Every outline of the lot, already projected to SVG points (see CampusMapView).
   */
  outlines: { x: number; y: number }[][];
  /** Projected centroid, for the label. */
  center: { x: number; y: number };
  /**
   * Highlight color used by the Parking tab.
   */
  color?: string;
  /** A route's start or destination: a thick outline in that color over the fill. */
  highlightColor?: string;
  onPress?: () => void;
};

export function LotFootprint({
  label,
  outlines,
  center,
  color,
  highlightColor,
  onPress,
}: LotFootprintProps) {
  const theme = useTheme();

  const drawable = outlines.filter((points) => points.length >= 3);

  if (drawable.length === 0) {
    return null;
  }

  const shapeColor = color ?? highlightColor ?? theme.textSecondary;
  const filled = !!(color ?? highlightColor);

  return (
    <G onPress={onPress}>
      {drawable.map((points, index) => (
        <Polygon
          key={index}
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={shapeColor}
          fillOpacity={filled ? 0.5 : 0.18}
          stroke={highlightColor ?? shapeColor}
          strokeOpacity={filled ? 1 : 0.5}
          strokeWidth={highlightColor ? 2.5 : 1}
        />
      ))}

      <SvgText
        x={center.x}
        y={center.y}
        fontSize={6}
        fontWeight={filled ? '600' : 'normal'}
        fill={filled ? theme.text : theme.textSecondary}
        textAnchor="middle"
        alignmentBaseline="middle">
        {label}
      </SvgText>
    </G>
  );
}