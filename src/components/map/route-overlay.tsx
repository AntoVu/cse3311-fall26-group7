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
  /**
   * When one floor of a building is shown: the pieces of the route to draw solid (outdoors and
   * that floor). The rest of the route is then drawn faded, so it still reads as one walk.
   */
  solidPieces?: Point[][];
};

/**
 * The walking route: a line from where you are to where you are going, with a dot at each end.
 *
 * Drawn twice -- a wide casing in the page background color, then the line on top. That is the
 * usual way map routes stay legible whatever they cross, and without it the blue disappears
 * against a dark parking lot.
 */
export function RouteOverlay({ points, solidPieces }: RouteOverlayProps) {
  const theme = useTheme();

  if (points.length < 2) {
    return null;
  }

  const toAttr = (line: Point[]) => line.map((point) => `${point.x},${point.y}`).join(' ');
  const start = points[0];
  const destination = points[points.length - 1];

  return (
    <G>
      {solidPieces ? (
        <Polyline
          points={toAttr(points)}
          fill="none"
          stroke={ROUTE_COLORS.line}
          strokeOpacity={0.4}
          strokeWidth={ROUTE_LINE_WIDTH / 2}
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {(solidPieces ?? [points]).map((line, index) => (
        <G key={index}>
          <Polyline
            points={toAttr(line)}
            fill="none"
            stroke={theme.background}
            strokeWidth={ROUTE_CASING_WIDTH}
            strokeOpacity={0.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points={toAttr(line)}
            fill="none"
            stroke={ROUTE_COLORS.line}
            strokeWidth={ROUTE_LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ))}
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
