import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsMenuItem } from '@/components/settings/settings-menu-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

/**
 * Credits for the data the map is built from, and the links to Privacy and Terms of use.
 *
 * Not optional decoration: the campus geometry comes from OpenStreetMap under the Open
 * Database License, which requires the source be credited wherever the data is shown.
 */
export default function AboutScreen() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'About' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedText type="subtitle">Mavigator</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          A campus navigation app for UT Arlington, built by CSE 3311 Team 7. A student project, not
          affiliated with or endorsed by UTA.
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
            onPress={() => void WebBrowser.openBrowserAsync(OSM_COPYRIGHT_URL)}>
            <ThemedText type="link">openstreetmap.org/copyright</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Parking rules</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Permit rules are our reading of UTA Parking and Transportation Services&apos; maps and may be
            out of date. Always check the signs posted at a lot: they are what is enforced.
          </ThemedText>
        </View>
        <View style={styles.section}>
          <ThemedText type="smallBold">Indoor maps</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Hallways, rooms and stairs were traced from UTA&apos;s building evacuation diagrams. The
            diagrams themselves are not included.
          </ThemedText>
        </View>
        <View style={[styles.section, styles.links]}>
          <SettingsMenuItem label="Privacy" onPress={() => router.push('/settings/privacy')} />
          <SettingsMenuItem label="Terms of use" onPress={() => router.push('/settings/terms')} />
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
  links: { gap: Spacing.two },
});
