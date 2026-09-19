import { LegendBox, LegendRow } from '@/components/map/map-legend';
import { PARKING_LOT_DEFAULT_COLOR } from '@/constants/parking-map';
import { useTheme } from '@/hooks/use-theme';

// Placeholder legend: only the "no permit selected" state exists so far. Add a
// row per access colour once lots are coloured by permit.
export function ParkingMapLegend() {
  const theme = useTheme();

  return (
    <LegendBox>
      <LegendRow color={PARKING_LOT_DEFAULT_COLOR} label="Parking lot: no permit selected" />
      <LegendRow color={theme.textSecondary} label="Building" />
    </LegendBox>
  );
}
