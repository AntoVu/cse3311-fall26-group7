import { LegendBox, LegendRow } from '@/components/map/map-legend';
import { PARKING_ESTIMATE_COLORS } from '@/constants/parking-crowding';
import { useTheme } from '@/hooks/use-theme';

export function ParkingMapLegend() {
  const theme = useTheme();

  return (
    <LegendBox>
      <LegendRow color={PARKING_ESTIMATE_COLORS.low} label="Permitted · estimated low crowding" />
      <LegendRow color={PARKING_ESTIMATE_COLORS.moderate} label="Permitted · estimated moderate crowding" />
      <LegendRow color={PARKING_ESTIMATE_COLORS.heavy} label="Permitted · estimated heavy crowding" />
      <LegendRow color={PARKING_ESTIMATE_COLORS.restricted} label="Not allowed for this permit or time" />
      <LegendRow color={theme.textSecondary} label="Building" />
    </LegendBox>
  );
}
