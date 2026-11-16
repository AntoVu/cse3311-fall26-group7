import { Stack } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Where privacy questions and report-removal requests go (Anthony's project email). */
export const CONTACT_EMAIL = 'anthonyvu.attv@gmail.com';
/** When the Privacy and Terms pages last changed. Update it with their text. */
export const LEGAL_UPDATED = 'November 15, 2026';

export type TextSection = { title: string; lines: string[] };

/** A scrolling page of headed paragraphs ending with the contact email (Settings > About > Privacy, Terms). */
export function TextPage({ title, intro, sections }: { title: string; intro: string; sections: TextSection[] }) {
  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            {intro} Last updated {LEGAL_UPDATED}.
          </ThemedText>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <ThemedText type="smallBold">{section.title}</ThemedText>
              {section.lines.map((line) => (
                <ThemedText key={line} type="small" themeColor="textSecondary">
                  {line}
                </ThemedText>
              ))}
            </View>
          ))}
          <View style={styles.section}>
            <ThemedText type="smallBold">Contact</ThemedText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Email ${CONTACT_EMAIL}`}
              onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
              <ThemedText type="linkPrimary">{CONTACT_EMAIL}</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  section: { gap: Spacing.one },
});
