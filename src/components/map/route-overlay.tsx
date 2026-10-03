import { Circle, G, Polyline } from 'react-native-svg';

import {
  ROUTE_CASING_WIDTH,
  ROUTE_COLORS,
  ROUTE_LINE_WIDTH,
  ROUTE_MARKER_RADIUS,
} from '@/constants/routing';
import { useTheme } from '@/hooks/use-theme';

type Point = { x: number; y: number };

type RouteOverlayProps = {
  /** The route line, already projected into SVG points (see CampusMapView). */
  points: Point[];
};

/**
 * The walking route: a line from where you are to where you are going, with a dot at each end.
 *
 * Drawn twice -- a wide casing in the page background color, then the line on top. That is the
 * usual way map routes stay legible whatever they cross, and without it the blue disappears
 * against a dark parking lot.
 */
export function RouteOverlay({ points }: RouteOverlayProps) {
  const theme = useTheme();

  if (points.length < 2) {
    return null;
  }

  const pointsAttr = points.map((point) => `${point.x},${point.y}`).join(' ');
  const start = points[0];
  const destination = points[points.length - 1];

  return (
    <G>
      <Polyline
        points={pointsAttr}
        fill="none"
        stroke={theme.background}
        strokeWidth={ROUTE_CASING_WIDTH}
        strokeOpacity={0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points={pointsAttr}
        fill="none"
        stroke={ROUTE_COLORS.line}
        strokeWidth={ROUTE_LINE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={start.x}
        cy={start.y}
        r={ROUTE_MARKER_RADIUS}
        fill={ROUTE_COLORS.start}
        stroke={theme.background}
        strokeWidth={3}
      />
      <Circle
        cx={destination.x}
        cy={destination.y}
        r={ROUTE_MARKER_RADIUS}
        fill={ROUTE_COLORS.destination}
        stroke={theme.background}
        strokeWidth={3}
      />
    </G>
  );
}
