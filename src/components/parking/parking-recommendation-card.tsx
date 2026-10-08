import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { permitFromChoice } from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { parseTimeString, useSchedule } from '@/context/schedule-context';
import { findBuilding } from '@/data/buildings';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { useTheme } from '@/hooks/use-theme';
import { campusGraph } from '@/routing/campus-graph';
import { formatDistance, formatDuration } from '@/routing/format';
import { recommendLots, type LotRecommendation } from '@/routing/parking-recommendation';
import { useSelectedParkingPermit } from '@/state/parking-permit';

// Where to park for the next class (US-01). Drawn by the Parking tab's drawer (parking-drawer.tsx).
//
// Ranks by walking time from the lot to the class, over lots the permit may use at the time
// the class starts. It does not claim a lot will have a space -- there is no occupancy feed
// to base that on -- so the wording promises a legal lot and a walk, nothing more.

/** The next class, its building, the best lots for it, and what is missing if there are none. */
export function useParkingRecommendation() {
  const { classes } = useSchedule();
  const permit = permitFromChoice(useSelectedParkingPermit());

  const nextClass = classes.find((scheduleClass) => scheduleClass.status === 'upcoming');
  const destination = nextClass ? findBuilding(nextClass.buildingId) : undefined;

  const recommendations =
    permit && destination && nextClass
      ? recommendLots({
          permit,
          destination: destination.coordinate,
          arrivalTime: arrivalTimeFor(nextClass.startTime),
          graph: campusGraph,
          lots: CAMPUS_LOTS,
          limit: 3,
        })
      : [];

  const note = noteFor({ permit, nextClass, destination, recommendations });
  return { nextClass, destination, recommendations, note };
}

export function LotRow({
  recommendation,
  best,
  selected,
  onPress,
}: {
  recommendation: LotRecommendation;
  best: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Park in ${recommendation.lot.label}, ${formatDuration(
        recommendation.walkMinutes
      )} walk`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.lotRow,
        { backgroundColor: selected ? theme.backgroundSelected : 'transparent' },
      ]}>
      <ThemedText type={best ? 'smallBold' : 'small'} style={styles.lotName} numberOfLines={1}>
        {recommendation.lot.label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatDistance(recommendation.walkMeters)} · {formatDuration(recommendation.walkMinutes)}
      </ThemedText>
    </Pressable>
  );
}

/** Says exactly what is missing, rather than showing an empty card. */
function noteFor({
  permit,
  nextClass,
  destination,
  recommendations,
}: {
  permit: unknown;
  nextClass: unknown;
  destination: unknown;
  recommendations: LotRecommendation[];
}): string | null {
  if (!permit) return 'Choose your parking pass to see where you can park.';
  if (!nextClass) return 'No class left today, so there is nothing to park for.';
  if (!destination) return 'That class is in a building that is not on the map.';
  if (recommendations.length === 0) {
    return 'No lot your pass covers is reachable on foot from that class.';
  }
  return null;
}

/**
 * Today at the class's start time, which is the moment the permit rules have to hold.
 *
 * Reuses the schedule's own parser rather than adding another 12-hour regex. The repo already
 * has two of those and they disagree at the edges.
 */
function arrivalTimeFor(startTime: string): Date {
  const minutes = parseTimeString(startTime);
  const now = new Date();
  if (isNaN(minutes)) return now;

  const arrival = new Date(now);
  arrival.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return arrival;
}

const styles = StyleSheet.create({
  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  lotName: { flex: 1 },
});
