import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ScheduleClass } from '@/mocks/schedule';

type ClassListItemProps = {
  scheduleClass: ScheduleClass;
  onPress: (scheduleClass: ScheduleClass) => void;
};

export function ClassListItem({ scheduleClass, onPress }: ClassListItemProps) {
  const showUpcomingInfo = !scheduleClass.completed && scheduleClass.startsInMinutes != null;

  return (
    <Pressable onPress={() => onPress(scheduleClass)}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.headerRow}>
          <ThemedText type="smallBold">
            {scheduleClass.courseCode}: {scheduleClass.courseName}
          </ThemedText>
          {scheduleClass.completed ? <ThemedText type="small">Done</ThemedText> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {scheduleClass.buildingCode} {scheduleClass.roomNumber} · {scheduleClass.startTime}{' '}
          - {scheduleClass.endTime}
        </ThemedText>
        {showUpcomingInfo ? (
          <ThemedText type="small" themeColor="textSecondary">
            Upcoming class · Starts in {scheduleClass.startsInMinutes} mins
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
  },
});
