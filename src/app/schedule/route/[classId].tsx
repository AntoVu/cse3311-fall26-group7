import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSchedule } from '@/context/schedule-context';

// Stub for Iteration 1: real turn-by-turn routing (outdoor + indoor) needs
// actual pathfinding, which is Iteration 2's job.
export default function RoutePreviewScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { classes, removeClass } = useSchedule();
  const scheduleClass = classes.find((candidate) => candidate.id === classId);

  const handleRemoveClass = () => {
    if (!scheduleClass) return;
    const message = `Are you sure you want to remove ${scheduleClass.courseCode} from your schedule?`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        removeClass(scheduleClass.id);
        router.back();
      }
    } else {
      Alert.alert('Remove Class', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeClass(scheduleClass.id);
            router.back();
          },
        },
      ]);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: scheduleClass?.courseCode ?? 'Route',
          headerRight: scheduleClass
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${scheduleClass.courseCode}`}
                  onPress={handleRemoveClass}
                  hitSlop={8}
                  style={({ pressed }) => [styles.headerRemoveButton, pressed && styles.pressed]}>
                  <ThemedText style={styles.headerRemoveText}>Remove</ThemedText>
                </Pressable>
              )
            : undefined,
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {scheduleClass ? (
          <View style={styles.infoGroup}>
            <ThemedText type="subtitle">
              {scheduleClass.courseCode}: {scheduleClass.courseName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {scheduleClass.buildingCode} {scheduleClass.roomNumber}
              {scheduleClass.startTime && scheduleClass.endTime
                ? ` · ${scheduleClass.startTime} - ${scheduleClass.endTime}`
                : ''}
            </ThemedText>
            <ThemedText type="small">Turn-by-turn routing is coming in a later iteration.</ThemedText>
          </View>
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
  },
  infoGroup: {
    gap: Spacing.two,
  },
  headerRemoveButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  headerRemoveText: {
    color: '#e53935',
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
});
