import { Children, isValidElement, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { POI_CATEGORY_COLORS } from '@/components/map/poi-marker';
import { POI_CATEGORY_LABELS, POI_CATEGORY_ORDER } from '@/constants/poi-categories';
import { withOpacity } from '@/constants/schedule';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';

// Only the categories the map actually draws: a swatch for a kind of building nobody has
// labeled yet would explain nothing.
const CATEGORIES_ON_MAP = POI_CATEGORY_ORDER.filter((category) =>
  CAMPUS_POIS.some((poi) => poi.category === category)
);

// Bottom space that lifts map overlays clear of the native tab bar, which floats over the screen.
// The web tab bar sits below the screen instead, so there nothing needs lifting.
export const MAP_OVERLAY_BOTTOM = Platform.OS === 'web' ? 0 : 85;

/**
 * How a legend is drawn:
 * - `chip`: a small "Legend" pill showing the colors, which opens into the full list on tap.
 *   Its parent decides where it sits.
 * - `plain`: just the rows, for inside another panel (the Parking tab's drawer).
 */
export type LegendVariant = 'chip' | 'plain';

/** The look shared by everything that floats over the map: near-opaque surface, soft shadow. */
export function overlaySurface(backgroundElement: string) {
  return {
    backgroundColor: withOpacity(backgroundElement, 0.94),
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.18)',
  };
}

/** Legend shared by the Map and Parking tabs. */
export function LegendBox({
  children,
  variant = 'chip',
}: {
  children: ReactNode;
  variant?: LegendVariant;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (variant === 'chip') {
    // The swatches double as the collapsed chip's preview, so it still says something closed.
    const colors = Children.toArray(children).flatMap((child) =>
      isValidElement<{ color?: string }>(child) && child.props.color ? [child.props.color] : []
    );
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Hide legend' : 'Show legend'}
        onPress={() => setOpen((current) => !current)}
        style={[open ? styles.panel : styles.chip, overlaySurface(theme.backgroundElement)]}>
        {open ? (
          <>
            <Text style={[styles.panelTitle, { color: theme.textSecondary }]}>Legend</Text>
            <View style={styles.list}>{children}</View>
          </>
        ) : (
          <>
            <View style={styles.dots}>
              {[...new Set(colors)].map((color, index) => (
                <View
                  key={color}
                  style={[
                    styles.dot,
                    { backgroundColor: color, borderColor: theme.backgroundElement },
                    index > 0 && styles.dotOverlap,
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.chipLabel, { color: theme.text }]}>Legend</Text>
          </>
        )}
      </Pressable>
    );
  }

  return <View style={styles.list}>{children}</View>;
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

export function MapLegend({ variant }: { variant?: LegendVariant }) {
  const theme = useTheme();

  return (
    <LegendBox variant={variant}>
      {CATEGORIES_ON_MAP.map((category) => (
        <LegendRow
          key={category}
          color={POI_CATEGORY_COLORS[category]}
          label={POI_CATEGORY_LABELS[category]}
        />
      ))}
      <LegendRow color={theme.textSecondary} label="Parking lot / garage" />
    </LegendBox>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dots: {
    flexDirection: 'row',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  dotOverlap: {
    marginLeft: -4,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  panel: {
    alignSelf: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 16,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 6,
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
