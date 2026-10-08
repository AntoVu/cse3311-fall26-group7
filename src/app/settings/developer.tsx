import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { type OverlayLayout, setOverlayLayout, useOverlayLayout } from '@/state/dev-options';

// Temporary: lets us compare the Map and Parking tab layouts on a phone. Once one is picked,
// the others and this option go away; the Developer screen stays for later simulations.
const LAYOUT_OPTIONS: { label: string; description: string; value: OverlayLayout }[] = [
  { label: 'Current', description: 'The layout before this experiment', value: 'current' },
  {
    label: 'Compact',
    description: 'Pass and best lot share one row above the map; legend is a chip',
    value: 'compact',
  },
  {
    label: 'Floating',
    description: 'Map fills the screen; one collapsible card floats at the top',
    value: 'floating',
  },
  {
    label: 'Drawer',
    description: 'Map fills the screen; lots and legend live in a pull-up drawer',
    value: 'drawer',
  },
  {
    label: 'Buttons',
    description: 'Map fills the screen; round buttons open each panel in a sheet',
    value: 'buttons',
  },
];

export default function DeveloperScreen() {
  const layout = useOverlayLayout();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Developer' }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            Temporary switches for testing. They reset when the page reloads.
          </ThemedText>

          <ThemedText type="smallBold">Map overlay layout</ThemedText>
          {LAYOUT_OPTIONS.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              description={option.description}
              selected={layout === option.value}
              onPress={() => setOverlayLayout(option.value)}
            />
          ))}
        </ScrollView>
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
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  description: {
    marginBottom: Spacing.two,
  },
});
