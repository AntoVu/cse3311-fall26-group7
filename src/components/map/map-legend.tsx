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

export function MapLegend() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {CATEGORY_ORDER.map((category) => (
        <View key={category} style={styles.row}>
          <View style={[styles.swatch, { backgroundColor: POI_CATEGORY_COLORS[category] }]} />
          <ThemedText type="small">{CATEGORY_LABELS[category]}</ThemedText>
        </View>
      ))}
      <View style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: theme.textSecondary }]} />
        <ThemedText type="small">Parking lot / garage</ThemedText>
      </View>
    </View>
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
