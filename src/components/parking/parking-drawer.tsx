import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAP_OVERLAY_BOTTOM, overlaySurface } from '@/components/map/map-legend';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import {
  LotRow,
  useParkingRecommendation,
} from '@/components/parking/parking-recommendation-card';
import { ThemedText } from '@/components/themed-text';
import { NO_PERMIT } from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { buildingName } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/routing/format';
import type { CampusLot } from '@/types/map';

type ParkingDrawerProps = {
  permitLabel: string;
  /** Which lot's walking route is currently drawn, if any. */
  selectedLotId?: string;
  onSelectLot: (lot: CampusLot) => void;
  onOpenPermit: () => void;
};

const EDGE = 12;

/**
 * The Parking tab's overlays (US-01): a pass chip at the top left, and a bottom drawer showing the
 * best lot that opens to the top three lots and the legend.
 */
export function ParkingDrawer({
  permitLabel,
  selectedLotId,
  onSelectLot,
  onOpenPermit,
}: ParkingDrawerProps) {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { nextClass, recommendations, note } = useParkingRecommendation();
  const none = permitLabel === NO_PERMIT;
  const best = recommendations[0];
  // One line each while closed; full text when open.
  const lines = open ? undefined : 1;

  return (
    <>
      <View pointerEvents="box-none" style={[styles.passRow, { top: top + EDGE }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Selected pass: ${permitLabel}. Tap to change it.`}
          onPress={onOpenPermit}
          style={[styles.passChip, overlaySurface(theme.backgroundElement)]}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {none ? 'Choose a pass' : permitLabel} ▾
          </ThemedText>
        </Pressable>
      </View>

      {/* ponytail: tap to open only; add a drag gesture if people try to drag it. */}
      <View style={[styles.drawer, overlaySurface(theme.backgroundElement)]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? 'Close parking details' : 'Open parking details'}
          onPress={() => setOpen((current) => !current)}
          style={styles.header}>
          <View style={[styles.handle, { backgroundColor: theme.textSecondary }]} />
          <ThemedText type="smallBold" numberOfLines={lines} style={styles.centered}>
            {best
              ? `Best: ${best.lot.label} · ${formatDuration(best.walkMinutes)} walk`
              : none
                ? 'Choose your parking pass'
                : note}
          </ThemedText>
          {nextClass && best ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={lines}
              style={styles.centered}>
              For {nextClass.courseCode} at {nextClass.startTime} ·{' '}
              {buildingName(nextClass.buildingId)}
            </ThemedText>
          ) : null}
        </Pressable>
        {open ? (
          <View style={styles.body}>
            {recommendations.map((recommendation, index) => (
              <LotRow
                key={recommendation.lot.id}
                recommendation={recommendation}
                best={index === 0}
                selected={recommendation.lot.id === selectedLotId}
                onPress={() => onSelectLot(recommendation.lot)}
              />
            ))}
            {recommendations.length > 0 ? (
              <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            ) : null}
            <ParkingMapLegend variant="plain" />
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  passRow: {
    position: 'absolute',
    left: EDGE,
    right: EDGE,
    alignItems: 'flex-start',
  },
  passChip: {
    flexShrink: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: MAP_OVERLAY_BOTTOM,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingBottom: EDGE,
  },
  header: {
    alignItems: 'center',
    gap: 2,
    paddingTop: Spacing.two,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
    marginBottom: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
  body: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  divider: {
    height: 1,
  },
});
