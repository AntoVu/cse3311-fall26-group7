import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Temporary switches for trying things out on a real phone (simulated time of day, traffic...).
// Empty for now: the map overlay layout comparison that started it is settled (Drawer).
// Remove this screen and its Settings row before the final demo.
export default function DeveloperScreen() {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Developer' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="small" themeColor="textSecondary">
          Nothing to test right now.
        </ThemedText>
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
});
