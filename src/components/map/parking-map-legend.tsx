import { LegendBox, LegendRow } from '@/components/map/map-legend';
import { PARKING_COLORS } from '@/constants/parking-permits';
import { useTheme } from '@/hooks/use-theme';

export function ParkingMapLegend() {
  const theme = useTheme();

  return (
    <LegendBox>
      <LegendRow color={PARKING_COLORS.allowed} label="Allowed" />
      <LegendRow color={PARKING_COLORS.restricted} label="Not allowed" />
      <LegendRow color={PARKING_COLORS.timeRestricted} label="Time-restricted" />
      <LegendRow color={PARKING_COLORS.checkSigns} label="Check signs" />
      <LegendRow color={theme.textSecondary} label="Building" />
    </LegendBox>
  );
}
