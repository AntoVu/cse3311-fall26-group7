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
};

export function PoiMarker({ poi, x, y, onPress }: PoiMarkerProps) {
  const theme = useTheme();

  return (
    <G onPress={() => onPress(poi)}>
      <Circle cx={x} cy={y} r={14} fill={POI_CATEGORY_COLORS[poi.category]} />
      <SvgText x={x} y={y + 26} fontSize={16} fill={theme.text} textAnchor="middle">
        {poi.name}
      </SvgText>
    </G>
  );
}
