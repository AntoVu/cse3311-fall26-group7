import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { displayTime } from '@/components/settings/time-format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showAlert } from '@/components/ui/alert';
import { ROUTE_COLORS } from '@/constants/routing';
import { Spacing } from '@/constants/theme';
import { parseMyMavSchedule } from '@/context/mymav-parser';
import { formatDays, useSchedule, type AddClassInput } from '@/context/schedule-context';
import { buildingLabel } from '@/data/buildings';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { useTimeFormat } from '@/state/time-format';

/** A class already on the schedule: same course, start time and days. */
const sameClass = (a: AddClassInput, b: AddClassInput) =>
  a.courseCode === b.courseCode && a.startTime === b.startTime && formatDays(a.days) === formatDays(b.days);

/**
 * Import MyMav Schedule (US-05): paste the "My Class Schedule" page, check what was read, then add
 * it. Reading is parseMyMavSchedule; anything it can't place is listed with why, to add by hand.
 */
export default function ImportMyMavScreen() {
  const router = useRouter();
  const theme = useTheme();
  const timeFormat = useTimeFormat();
  const { classes: current, addClass } = useSchedule();
  const [text, setText] = useState('');
  const [result, setResult] = useState<ReturnType<typeof parseMyMavSchedule> | null>(null);

  const fresh = result ? result.classes.filter((c) => !current.some((existing) => sameClass(existing, c))) : [];

  function handleAdd() {
    // Our own ids (course, days, start): createScheduleClass's come from the clock, and several
    // added in one millisecond would share one. A repeat import is filtered out above, so these stay unique.
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    fresh.forEach((c) => addClass({ ...c, id: `mymav-${slug(`${c.courseCode} ${c.days?.join('')} ${c.startTime}`)}` }));
    showAlert('Schedule imported', `Added ${fresh.length} class${fresh.length === 1 ? '' : 'es'}.`);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Import MyMav' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="small" themeColor="textSecondary">
            In MyMav, open My Class Schedule in List View. Select everything on the page (Ctrl+A, or long-press and
            Select All), copy it, and paste it here.
          </ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            multiline
            placeholder="CSE 3311 - Object-Oriented Software Engineering..."
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={(value) => {
              setText(value);
              setResult(null);
            }}
            accessibilityLabel="Pasted MyMav schedule"
          />
          <Pressable
            accessibilityRole="button"
            disabled={!text.trim()}
            onPress={() => setResult(parseMyMavSchedule(text, CAMPUS_POIS))}
            style={[styles.button, !text.trim() && styles.dimmed]}>
            <ThemedText style={styles.buttonText}>Read schedule</ThemedText>
          </Pressable>

          {result && result.classes.length === 0 && result.skipped.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No classes found. Copy the whole My Class Schedule page (List View) and try again.
            </ThemedText>
          ) : null}

          {result?.classes.map((c) => {
            const already = !fresh.includes(c);
            return (
              <ThemedView key={JSON.stringify(c)} type="backgroundElement" style={[styles.card, already && styles.dimmed]}>
                <ThemedText type="smallBold">
                  {c.courseCode} - {c.courseName}
                </ThemedText>
                <ThemedText type="small">
                  {buildingLabel(c.buildingId)} {c.roomNumber}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDays(c.days)} · {displayTime(c.startTime, timeFormat)} – {displayTime(c.endTime, timeFormat)}
                  {already ? ' · already on your schedule' : ''}
                </ThemedText>
              </ThemedView>
            );
          })}

          {result && result.skipped.length > 0 ? (
            <View style={styles.skipped}>
              <ThemedText type="smallBold">Not imported</ThemedText>
              {result.skipped.map((s) => (
                <ThemedText key={s.courseCode + s.reason} type="small" themeColor="textSecondary">
                  {s.courseCode}: {s.reason}
                </ThemedText>
              ))}
            </View>
          ) : null}

          {fresh.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={handleAdd} style={styles.button}>
              <ThemedText style={styles.buttonText}>
                Add {fresh.length} class{fresh.length === 1 ? '' : 'es'}
              </ThemedText>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, gap: Spacing.two },
  input: {
    borderRadius: 10,
    padding: Spacing.three,
    fontSize: 14,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: ROUTE_COLORS.line,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.one },
  skipped: { gap: Spacing.one, marginTop: Spacing.two },
  dimmed: { opacity: 0.5 },
});
