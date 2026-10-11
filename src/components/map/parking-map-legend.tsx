import { LegendBox, LegendRow, type LegendVariant } from '@/components/map/map-legend';
import { PARKING_COLORS } from '@/constants/parking-permits';
import { useTheme } from '@/hooks/use-theme';

export function ParkingMapLegend({ variant }: { variant?: LegendVariant }) {
  const theme = useTheme();

  return (
    <LegendBox variant={variant}>
      <LegendRow color={PARKING_COLORS.allowed} label="Allowed" />
      <LegendRow color={PARKING_COLORS.restricted} label="Not allowed" />
      <LegendRow color={PARKING_COLORS.timeRestricted} label="Opens at 1 PM" />
      <LegendRow color={theme.textSecondary} label="Lot not identified yet" />
      <LegendRow color={theme.textSecondary} label="Building" />
    </LegendBox>
  );
}
