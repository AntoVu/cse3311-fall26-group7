import { Circle, G } from 'react-native-svg';

import { ROUTE_COLORS } from '@/constants/routing';
import { useTheme } from '@/hooks/use-theme';

type UserLocationMarkerProps = {
  /** Already projected into SVG points (see CampusMapView). */
  x: number;
  y: number;
  /** A hand-dropped pin is drawn differently, so it is never mistaken for a real fix. */
  pinned: boolean;
};

/** Where the user is: a filled dot for a device fix, a hollow one for a dropped pin. */
export function UserLocationMarker({ x, y, pinned }: UserLocationMarkerProps) {
  const theme = useTheme();

  return (
    <G>
      <Circle cx={x} cy={y} r={14} fill={ROUTE_COLORS.line} fillOpacity={0.18} />
      <Circle
        cx={x}
        cy={y}
        r={8}
        fill={pinned ? theme.background : ROUTE_COLORS.line}
        stroke={ROUTE_COLORS.line}
        strokeWidth={pinned ? 4 : 3}
      />
    </G>
  );
}
