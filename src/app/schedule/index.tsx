import { useRouter } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ClassListItem } from '@/components/schedule/class-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MOCK_SCHEDULE } from '@/mocks/schedule';
import type { ScheduleClass } from '@/mocks/schedule';

export default function ScheduleScreen() {
  const router = useRouter();

  const handleSelectClass = (scheduleClass: ScheduleClass) => {
    router.push({ pathname: '/schedule/route/[classId]', params: { classId: scheduleClass.id } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Schedule
        </ThemedText>
        <FlatList
          data={MOCK_SCHEDULE}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <ClassListItem scheduleClass={item} onPress={handleSelectClass} />}
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
});
