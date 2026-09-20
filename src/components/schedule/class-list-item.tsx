import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ScheduleClass } from '@/mocks/schedule';

type ClassListItemProps = {
  scheduleClass: ScheduleClass;
  onPress: (scheduleClass: ScheduleClass) => void;
  onRemove?: (scheduleClass: ScheduleClass) => void;
};

export function ClassListItem({ scheduleClass, onPress, onRemove }: ClassListItemProps) {
  const isDone = scheduleClass.status === 'done' || scheduleClass.completed;
  const isUpcoming = scheduleClass.status === 'upcoming' || (!isDone && scheduleClass.startsInMinutes != null);

  const handleRemove = (event: GestureResponderEvent) => {
    event.stopPropagation?.();
    onRemove?.(scheduleClass);
  };

  return (
    <Pressable onPress={() => onPress(scheduleClass)}>
      <ThemedView type="backgroundElement" style={styles.card}>
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
            Upcoming class ·{' '}
            {scheduleClass.startsInMinutes != null && scheduleClass.startsInMinutes > 0
              ? `Starts in ${scheduleClass.startsInMinutes} min${scheduleClass.startsInMinutes === 1 ? '' : 's'}`
              : 'In progress'}
            {scheduleClass.distanceMiles != null
              ? ` · ${scheduleClass.distanceMiles} miles away`
              : ''}
            {scheduleClass.walkMinutes != null ? ` · ~${scheduleClass.walkMinutes} min walk` : ''}
          </ThemedText>
        ) : null}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
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

