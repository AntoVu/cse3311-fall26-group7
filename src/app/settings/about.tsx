import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

/**
 * Credits for the data the map is built from.
 *
 * Not optional decoration: the campus geometry comes from OpenStreetMap under the Open
 * Database License, which requires the source be credited wherever the data is shown.
 */
export default function AboutScreen() {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'About' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="subtitle">Mavigator</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          A campus navigation app for UT Arlington, built for CSE 3311.
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="smallBold">Map data</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Building outlines, parking areas, streets and walking paths are © OpenStreetMap
            contributors, made available under the Open Database License (ODbL).
          </ThemedText>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open the OpenStreetMap copyright page"
            onPress={() => WebBrowser.openBrowserAsync(OSM_COPYRIGHT_URL)}>
            <ThemedText type="link">openstreetmap.org/copyright</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Parking rules</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Permit rules follow UTA Parking and Transportation Services. Always check the signs
            posted at a lot: they are what is enforced.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  section: { gap: Spacing.one, marginTop: Spacing.three },
});
