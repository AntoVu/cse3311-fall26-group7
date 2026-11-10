import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapDrawer, OVERLAY_EDGE, OverlayChip } from '@/components/map/map-overlays';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import {
  LotRow,
  useParkingRecommendation,
} from '@/components/parking/parking-recommendation-card';
import { displayTime } from '@/components/settings/time-format';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { NO_PERMIT } from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { buildingName } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/routing/format';
import { useTimeFormat } from '@/state/time-format';
import type { CampusLot } from '@/types/map';

type ParkingDrawerProps = {
  permitLabel: string;
  /** Which lot's walking route is currently drawn, if any. */
  selectedLotId?: string;
  /** The tapped lot's status and walk, shown instead of the best lot while set. */
  lotCard?: { title: string; status: string; walk: string };
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
  onClearLot,
  onSelectLot,
  onOpenPermit,
}: ParkingDrawerProps) {
  const theme = useTheme();
  const timeFormat = useTimeFormat();
  const { top } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { nextClass, recommendations, note } = useParkingRecommendation();
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
              <Chip label="Show best lots" onPress={onClearLot} />
            </View>
          ) : undefined
        }>
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
      </MapDrawer>
    </>
  );
}

const styles = StyleSheet.create({
  passRow: {
    position: 'absolute',
    left: OVERLAY_EDGE,
    right: OVERLAY_EDGE,
    alignItems: 'flex-start',
  },
  centered: {
    textAlign: 'center',
  },
  clearRow: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  divider: {
    height: 1,
  },
});
