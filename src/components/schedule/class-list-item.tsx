import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CLASS_FLAG_COLORS, getClassFlagColor } from '@/constants/schedule';
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
      <ThemedView type="backgroundElement" style={styles.card}>
        <View testID="class-flag-bar" style={[styles.flagBar, { backgroundColor: flagColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold" style={styles.titleText}>
              {scheduleClass.courseCode}: {scheduleClass.courseName}
            </ThemedText>
            <View style={styles.headerActions}>
              {isDone ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Done
                </ThemedText>
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


