import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MOCK_SCHEDULE } from '@/mocks/schedule';

// Stub for Iteration 1 — real turn-by-turn routing (outdoor + indoor) needs
// actual pathfinding, which is Iteration 2's job.
export default function RoutePreviewScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const scheduleClass = MOCK_SCHEDULE.find((candidate) => candidate.id === classId);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: scheduleClass?.courseCode ?? 'Route' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {scheduleClass ? (
          <>
            <ThemedText type="subtitle">
              {scheduleClass.courseCode}: {scheduleClass.courseName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {scheduleClass.buildingCode} {scheduleClass.roomNumber}
            </ThemedText>
            <ThemedText type="small">Turn-by-turn routing is coming in a later iteration.</ThemedText>
          </>
        ) : (
          <ThemedText type="small">Class not found.</ThemedText>
        )}
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
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
