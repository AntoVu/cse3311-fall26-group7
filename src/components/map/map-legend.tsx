import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { POI_CATEGORY_COLORS } from '@/components/map/poi-marker';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PoiCategory } from '@/types/map';

const CATEGORY_LABELS: Record<PoiCategory, string> = {
  academic: 'Academic building',
  residence: 'On-campus residence',
  apartment: 'Nearby apartment',
};

const CATEGORY_ORDER: PoiCategory[] = ['academic', 'residence', 'apartment'];

/** Floating legend card shared by the Map and Parking tabs. */
export function LegendBox({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>{children}</View>
  );
}

export function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <ThemedText type="small">{label}</ThemedText>
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
  container: {
    position: 'absolute',
    left: Spacing.three,
    // The map itself runs full-bleed under the native tab bar (better for
    // panning/zooming), so the legend needs its own inset to float above it.
    bottom: BottomTabInset + Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
