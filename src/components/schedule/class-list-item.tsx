import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  CLASS_FLAG_COLORS,
  CLASS_STATUS_COLORS,
  getClassFlagColor,
  withOpacity,
} from '@/constants/schedule';
import { Spacing } from '@/constants/theme';
import type { ScheduleClass } from '@/mocks/schedule';

export { CLASS_FLAG_COLORS, getClassFlagColor };


type ClassListItemProps = {
  scheduleClass: ScheduleClass;
  onPress: (scheduleClass: ScheduleClass) => void;
  onRemove?: (scheduleClass: ScheduleClass) => void;
  color?: string;
  index?: number;
};

export function ClassListItem({
  scheduleClass,
  onPress,
  onRemove,
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

  const handleRemove = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    onRemove?.(scheduleClass);
  };

  return (
    <Pressable onPress={() => onPress(scheduleClass)}>
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
              {onRemove ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${scheduleClass.courseCode} from schedule`}
                  onPress={handleRemove}
                  hitSlop={8}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}>
                  <ThemedText type="small" style={styles.removeButtonText}>
                    Remove
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {scheduleClass.buildingCode} {scheduleClass.roomNumber} · {scheduleClass.startTime}{' '}
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
  removeButton: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  removeButtonPressed: {
    opacity: 0.6,
  },
  removeButtonText: {
    color: '#e53935',
  },
});


