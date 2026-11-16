import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overlaySurface } from '@/components/map/map-legend';
import { MapDrawer, OVERLAY_EDGE, OverlayChip } from '@/components/map/map-overlays';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import {
  LotRow,
  useParkingRecommendation,
} from '@/components/parking/parking-recommendation-card';
import { displayTime } from '@/components/settings/time-format';
import { Tip } from '@/components/onboarding/tip';
import { ThemedText } from '@/components/themed-text';
import { NO_PERMIT, PARKING_COLORS, PARKING_DISCLAIMER } from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { buildingName } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/routing/format';
import { parkingTargetStore } from '@/state/parking-target';
import { useTimeFormat } from '@/state/time-format';
import type { CampusLot } from '@/types/map';

type ParkingDrawerProps = {
  permitLabel: string;
  /** Which lot's walking route is currently drawn, if any. */
  selectedLotId?: string;
  /** The tapped lot's status and walk, shown instead of the best lot while set. */
  lotCard?: { title: string; status: string; walk: string };
  /** A note under the pass chip, e.g. that yellow lots open to this pass at 1 PM. */
  notice?: string;
  onClearLot: () => void;
  onSelectLot: (lot: CampusLot) => void;
  onOpenPermit: () => void;
};

/**
 * The Parking tab's overlays (US-01): a pass chip at the top left, and a bottom drawer showing the
 * best lot that opens to the top three lots and the legend.
 */
export function ParkingDrawer({
  permitLabel,
  selectedLotId,
  lotCard,
  notice,
  onClearLot,
  onSelectLot,
  onOpenPermit,
}: ParkingDrawerProps) {
  const theme = useTheme();
  const timeFormat = useTimeFormat();
  const { top } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { target, nextClass, recommendations, note } = useParkingRecommendation();
  const none = permitLabel === NO_PERMIT;
  const best = recommendations[0];
  // One line each while closed; full text when open.
  const lines = open ? undefined : 1;

  return (
    <>
      <View pointerEvents="box-none" style={[styles.passRow, { top: top + OVERLAY_EDGE }]}>
        <OverlayChip
          accessibilityLabel={`Selected pass: ${permitLabel}. Tap to change it.`}
          onPress={onOpenPermit}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {none ? 'Choose a pass' : permitLabel} ▾
          </ThemedText>
        </OverlayChip>
        {target ? (
          <OverlayChip
            accessibilityLabel={`Parking for ${target.name}. Tap to plan for your next class instead.`}
            onPress={() => parkingTargetStore.set(null)}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {`For ${target.name} ✕`}
            </ThemedText>
          </OverlayChip>
        ) : null}
        {notice ? (
          <View style={[styles.notice, overlaySurface(theme.backgroundElement)]}>
            <View style={[styles.noticeDot, { backgroundColor: PARKING_COLORS.timeRestricted }]} />
            <ThemedText type="small">{notice}</ThemedText>
          </View>
        ) : null}
        <Tip
          id="parking"
          text="Tap a lot to see if your pass works there, or a building to plan parking for it."
          style={styles.tip}
        />
      </View>

      <MapDrawer
        open={open}
        onToggle={() => setOpen((current) => !current)}
        label="parking details"
        header={
          lotCard ? (
            <>
              <ThemedText type="smallBold" numberOfLines={lines} style={styles.centered}>
                {lotCard.title}
              </ThemedText>
              <ThemedText type="small" numberOfLines={lines} style={styles.centered}>
                {lotCard.status}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={lines} style={styles.centered}>
                {lotCard.walk}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="smallBold" numberOfLines={lines} style={styles.centered}>
                {best
                  ? `Best: ${best.lot.label} · ${formatDuration(best.walkMinutes)} walk`
                  : none
                    ? 'Choose your parking pass'
                    : note}
              </ThemedText>
              {target && best ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={lines} style={styles.centered}>
                  {`For ${target.name}, arriving now`}
                </ThemedText>
              ) : null}
              {nextClass && best ? (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={lines}
                  style={styles.centered}>
                  For {nextClass.courseCode} at {displayTime(nextClass.startTime, timeFormat)} ·{' '}
                  {buildingName(nextClass.buildingId)}
                </ThemedText>
              ) : null}
            </>
          )
        }
        footer={
          lotCard ? (
            <View style={styles.clearRow}>
              {/* Filled so it reads as a button on the drawer in both themes (issue #45). */}
              <Pressable
                accessibilityRole="button"
                onPress={onClearLot}
                style={({ pressed }) => [
                  styles.bestLotsButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">Show best lots</ThemedText>
              </Pressable>
            </View>
          ) : undefined
        }
        // The legend floats on the drawer's top edge, as on the Map tab, instead of filling the drawer.
        above={<ParkingMapLegend />}>
        {recommendations.map((recommendation, index) => (
          <LotRow
            key={recommendation.lot.id}
            recommendation={recommendation}
            best={index === 0}
            selected={recommendation.lot.id === selectedLotId}
            onPress={() => onSelectLot(recommendation.lot)}
          />
        ))}
        <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
          {PARKING_DISCLAIMER}
        </ThemedText>
      </MapDrawer>
    </>
  );
}

const styles = StyleSheet.create({
  disclaimer: { marginTop: Spacing.two },
  passRow: {
    position: 'absolute',
    left: OVERLAY_EDGE,
    right: OVERLAY_EDGE,
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 16,
  },
  tip: { alignSelf: 'stretch' },
  noticeDot: { width: 10, height: 10, borderRadius: 5 },
  centered: {
    textAlign: 'center',
  },
  clearRow: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  bestLotsButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
