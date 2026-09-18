import { Polyline } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type StreetLineProps = {
  /** Path coordinates already projected to SVG points (see CampusMapView). */
  points: { x: number; y: number }[];
};

// Plain street centerlines so the campus grid reads correctly under the
// buildings/lots. No labels (yet) — buildings and lots already carry enough
// text; adding rotated street-name labels is a nice-to-have, not needed for
// Iteration 1.
export function StreetLine({ points }: StreetLineProps) {
  const theme = useTheme();

  if (points.length < 2) {
    return null;
  }

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Polyline
      points={pointsAttr}
      fill="none"
      stroke={theme.backgroundSelected}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
