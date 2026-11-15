import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { replayOnboarding } from '@/state/onboarding';

const SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: 'Map',
    lines: [
      'Search for a building by name, code or nickname (Nedderman Hall, NH, Planetarium), or a room like NH 340.',
      'Search "restroom", "vending" and so on to go to the nearest one. The i next to the search lists them all.',
      'Tap a building to see it. Tap Inside to see each floor, then tap a room to go there.',
      'Swipe the building card down, or tap around it, to close it.',
      'Long-press anywhere on the map to drop a pin. Routes then start from it.',
    ],
  },
  {
    title: 'Routes',
    lines: [
      'Tap "From …" at the top to change where you start: your location, Home, a building, a lot or a pin.',
      'Walk or Bike changes the time. Avoid crowds goes around busy areas at busy times.',
      'Go inside shows the walk to the room, floor by floor.',
    ],
  },
  {
    title: 'Schedule',
    lines: [
      'Add a class with "+ Add class", or import your classes from MyMav in Settings > Your Profile > Schedule.',
      'Tap a class to see the walk there. Edit lets you change or delete classes.',
    ],
  },
  {
    title: 'Parking',
    lines: [
      'Pick your pass at the top left. Green lots are yours now, yellow ones open to you at 1 PM, red ones are not.',
      'The drawer lists the best lots for your next class. Tap a lot to see if your pass works there, or a building to plan parking for it.',
      'Always check the signs: parking rules can change.',
    ],
  },
  {
    title: 'Something wrong?',
    lines: ['Open the building and tap "Report a problem". No account needed.'],
  },
];

/** Settings > How to use Mavigator: every gesture and feature in one place, and the welcome and tips again. */
export default function HelpScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'How to use Mavigator' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <ThemedText type="smallBold">{section.title}</ThemedText>
              {section.lines.map((line) => (
                <ThemedText key={line} type="small" themeColor="textSecondary">
                  {`• ${line}`}
                </ThemedText>
              ))}
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              replayOnboarding();
              router.navigate('/map');
            }}
            style={({ pressed }) => [styles.replay, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.replayText}>
              Show the welcome and tips again
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  section: { gap: Spacing.one },
  replay: { alignSelf: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: 999 },
  replayText: { color: '#ffffff' },
  pressed: { opacity: 0.6 },
});
