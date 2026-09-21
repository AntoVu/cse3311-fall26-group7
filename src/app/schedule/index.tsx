import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddClassSheet } from '@/components/schedule/add-class-sheet';
import { ClassListItem } from '@/components/schedule/class-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';
import type { ScheduleClass } from '@/mocks/schedule';

export default function ScheduleScreen() {
  const router = useRouter();
  const { classes } = useSchedule();
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);

  const handleSelectClass = (scheduleClass: ScheduleClass) => {
    router.push({ pathname: '/schedule/route/[classId]', params: { classId: scheduleClass.id } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Schedule
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Class"
            style={styles.addButton}
            onPress={() => setIsAddSheetVisible(true)}>
            <ThemedText style={styles.addButtonText}>+ Add Class</ThemedText>
          </Pressable>
        </View>

        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <ClassListItem
              scheduleClass={item}
              index={index}
              onPress={handleSelectClass}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No classes in your schedule.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add class to empty schedule"
                style={[styles.addButton, styles.emptyAddButton]}
                onPress={() => setIsAddSheetVisible(true)}>
                <ThemedText style={styles.addButtonText}>Add Class</ThemedText>
              </Pressable>
            </View>
          }
        />
      </SafeAreaView>

      <AddClassSheet
        visible={isAddSheetVisible}
        onClose={() => setIsAddSheetVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.one,
  },
  title: {
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: '#3c87f7',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyAddButton: {
    marginTop: Spacing.two,
  },
  // The list, not the screen, carries the side padding: the ScrollView clips anything outside
  // its bounds, so the cards' status glow needs room inside it on every side.
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
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
