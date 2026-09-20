import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { POI_CATEGORY_COLORS } from '@/components/map/poi-marker';
import { useTheme } from '@/hooks/use-theme';
import type { PoiCategory } from '@/types/map';

const CATEGORY_LABELS: Record<PoiCategory, string> = {
  academic: 'Academic building',
  residence: 'On-campus residence',
  apartment: 'Nearby apartment',
};

const CATEGORY_ORDER: PoiCategory[] = ['academic', 'residence', 'apartment'];

// Bottom space that lifts the legend clear of the native tab bar.
const LEGEND_BOTTOM_INSET = 85;

/**
 * Legend bar shared by the Map and Parking tabs: a centered, wrapping row of
 * color dots with labels, sitting just below the map above the tab bar.
 */
export function LegendBox({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

export function LegendRow({ color, label }: { color: string; label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

export function MapLegend() {
  const theme = useTheme();

  return (
    <LegendBox>
      {CATEGORY_ORDER.map((category) => (
        <LegendRow
          key={category}
          color={POI_CATEGORY_COLORS[category]}
          label={CATEGORY_LABELS[category]}
        />
      ))}
      <LegendRow color={theme.textSecondary} label="Parking lot / garage" />
    </LegendBox>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: LEGEND_BOTTOM_INSET,
    paddingHorizontal: 8,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  label: {
    fontSize: 11,
  },
});
