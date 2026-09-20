import { useRouter } from 'expo-router';
import { Alert, FlatList, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClassListItem } from '@/components/schedule/class-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';
import type { ScheduleClass } from '@/mocks/schedule';

export default function ScheduleScreen() {
  const router = useRouter();
  const { classes, removeClass } = useSchedule();

  const handleSelectClass = (scheduleClass: ScheduleClass) => {
    router.push({ pathname: '/schedule/route/[classId]', params: { classId: scheduleClass.id } });
  };

  const handleRemoveClass = (scheduleClass: ScheduleClass) => {
    const message = `Are you sure you want to remove ${scheduleClass.courseCode} from your schedule?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        removeClass(scheduleClass.id);
      }
    } else {
      Alert.alert('Remove Class', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeClass(scheduleClass.id),
        },
      ]);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Schedule
        </ThemedText>
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <ClassListItem
              scheduleClass={item}
              index={index}
              onPress={handleSelectClass}
              onRemove={handleRemoveClass}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No classes in your schedule.
              </ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  title: {
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  emptyContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

