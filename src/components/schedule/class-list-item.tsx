import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CLASS_FLAG_COLORS,
  CLASS_STATUS_COLORS,
  getClassFlagColor,
  withOpacity,
} from '@/constants/schedule';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ScheduleClass } from '@/mocks/schedule';
import { buildingLabel } from '@/data/buildings';

export { CLASS_FLAG_COLORS, getClassFlagColor };

/** The fill of a selected card's circle in Edit mode: the app's blue. */
const SELECTED_COLOR = '#3c87f7';


type ClassListItemProps = {
  scheduleClass: ScheduleClass;
  onPress: (scheduleClass: ScheduleClass) => void;
  /** Edit mode on the Schedule list: the card becomes a checkbox. */
  selection?: { selected: boolean };
  color?: string;
  index?: number;
};

export function ClassListItem({
  scheduleClass,
  onPress,
  selection,
  color,
  index,
}: ClassListItemProps) {
  const isDone = scheduleClass.status === 'done' || scheduleClass.completed;
  const isInProgress =
    !isDone &&
    scheduleClass.startsInMinutes != null &&
    scheduleClass.startsInMinutes <= 0;
  const isUpcoming =
    !isDone &&
    (scheduleClass.status === 'upcoming' || scheduleClass.startsInMinutes != null);
  const flagColor = color ?? getClassFlagColor(scheduleClass.courseCode, index);

  // In progress wins over upcoming so a card never glows two colors.
  const glowColor = isInProgress
    ? CLASS_STATUS_COLORS.inProgress
    : isUpcoming
      ? CLASS_STATUS_COLORS.upcoming
      : null;

  const statusLabel = isInProgress
    ? 'In progress'
    : scheduleClass.startsInMinutes != null && scheduleClass.startsInMinutes > 0
      ? `Upcoming class · Starts in ${scheduleClass.startsInMinutes} min${scheduleClass.startsInMinutes === 1 ? '' : 's'}`
      : 'Upcoming class';

  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onPress(scheduleClass)}
      {...(selection && {
        accessibilityRole: 'checkbox' as const,
        accessibilityLabel: scheduleClass.courseCode,
        accessibilityState: { checked: selection.selected },
      })}>
      <ThemedView
        type="backgroundElement"
        testID="class-card"
        style={[
          styles.card,
          glowColor && {
            borderColor: withOpacity(glowColor, 0.45),
            boxShadow: `0 0 12px 2px ${withOpacity(glowColor, 0.35)}`,
          },
        ]}>
        <View testID="class-flag-bar" style={[styles.flagBar, { backgroundColor: flagColor }]} />
        {selection ? (
          <View style={styles.selectColumn}>
            <View
              testID="class-select-mark"
              style={[
                styles.selectCircle,
                selection.selected
                  ? { backgroundColor: SELECTED_COLOR, borderColor: SELECTED_COLOR }
                  : { borderColor: theme.textSecondary },
              ]}>
              {selection.selected ? <View testID="class-select-tick" style={styles.selectTick} /> : null}
            </View>
          </View>
        ) : null}
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold" style={styles.titleText}>
              {scheduleClass.courseCode}: {scheduleClass.courseName}
            </ThemedText>
            <View style={styles.headerActions}>
              {isDone ? (
                <View
                  testID="class-done-check"
                  accessible
                  accessibilityLabel="Done"
                  style={styles.doneCircle}>
                  <View style={styles.doneTick} />
                </View>
              ) : null}
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {buildingLabel(scheduleClass.buildingId)} {scheduleClass.roomNumber} · {scheduleClass.startTime}{' '}
            - {scheduleClass.endTime}
          </ThemedText>
          {isUpcoming ? (
            <ThemedText type="small" themeColor="textSecondary">
              {statusLabel}
              {scheduleClass.distanceMiles != null
                ? ` · ${scheduleClass.distanceMiles} miles away`
                : ''}
              {scheduleClass.walkMinutes != null ? ` · ~${scheduleClass.walkMinutes} min walk` : ''}
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    // Always reserve the border so the status glow doesn't shift the layout.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  doneCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CLASS_STATUS_COLORS.done,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A rotated "L" (right + bottom borders) reads as a check on every platform, no icon font.
  doneTick: {
    width: 5,
    height: 10,
    marginTop: -2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: CLASS_STATUS_COLORS.done,
    transform: [{ rotate: '45deg' }],
  },
  flagBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titleText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  selectColumn: {
    justifyContent: 'center',
    paddingLeft: Spacing.three,
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Same drawn check as doneTick, in white on the filled circle.
  selectTick: {
    width: 5,
    height: 10,
    marginTop: -2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',
    transform: [{ rotate: '45deg' }],
  },
});


