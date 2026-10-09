import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddClassSheet } from '@/components/schedule/add-class-sheet';
import { ClassListItem } from '@/components/schedule/class-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { confirmAction } from '@/components/ui/alert';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';
import { useTheme } from '@/hooks/use-theme';
import type { ScheduleClass } from '@/mocks/schedule';

export default function ScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { classes, removeClass } = useSchedule();
  const [isAddSheetVisible, setIsAddSheetVisible] = useState(false);
  // Edit mode: tapping a card selects it, and Delete removes the selected ones.
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selected = selectedIds.filter((id) => classes.some((item) => item.id === id));

  const handlePressClass = (scheduleClass: ScheduleClass) => {
    if (!isEditing) {
      router.push({ pathname: '/schedule/route/[classId]', params: { classId: scheduleClass.id } });
      return;
    }
    setSelectedIds((current) =>
      current.includes(scheduleClass.id)
        ? current.filter((id) => id !== scheduleClass.id)
        : [...current, scheduleClass.id]
    );
  };

  const finishEditing = () => {
    setIsEditing(false);
    setSelectedIds([]);
  };

  const deleteSelected = async () => {
    const count = selected.length;
    const confirmed = await confirmAction(
      count === 1 ? 'Remove Class' : 'Remove Classes',
      `Remove ${count === 1 ? 'this class' : `these ${count} classes`} from your schedule?`,
      'Remove'
    );
    if (!confirmed) return;
    selected.forEach(removeClass);
    finishEditing();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Schedule
          </ThemedText>
          <View style={styles.headerActions}>
            {isEditing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: selected.length === 0 }}
                disabled={selected.length === 0}
                onPress={deleteSelected}
                hitSlop={8}
                style={({ pressed }) => [selected.length === 0 && styles.disabled, pressed && styles.pressed]}>
                <ThemedText style={styles.deleteText}>Delete ({selected.length})</ThemedText>
              </Pressable>
            ) : null}
            {isEditing || classes.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={isEditing ? finishEditing : () => setIsEditing(true)}
                hitSlop={8}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="linkPrimary" style={styles.editText}>
                  {isEditing ? 'Done' : 'Edit'}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <ClassListItem
              scheduleClass={item}
              index={index}
              onPress={handlePressClass}
              selection={isEditing ? { selected: selected.includes(item.id) } : undefined}
            />
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              No classes in your schedule.
            </ThemedText>
          }
          // Where the next class will appear: tap it to add one.
          ListFooterComponent={
            isEditing ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add Class"
                onPress={() => setIsAddSheetVisible(true)}
                style={({ pressed }) => [
                  styles.addPlaceholder,
                  { borderColor: theme.textSecondary },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  + Add class
                </ThemedText>
              </Pressable>
            )
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  editText: {
    fontWeight: '600',
  },
  deleteText: {
    color: '#e53935',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
  // The list, not the screen, carries the side padding: the ScrollView clips anything outside
  // its bounds, so the cards' status glow needs room inside it on every side.
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  // Same footprint as a class card (ClassListItem: radius Spacing.three, padding Spacing.three, two
  // text lines), drawn as a dashed outline.
  addPlaceholder: {
    minHeight: 64,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
