import { Stack } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { startPointOptions } from '@/routing/start-point';
import { homeStore, useHome } from '@/state/home';
import { setStartPoint } from '@/state/start-point';

// The residence halls and apartments, grouped, as the start-point picker lists them.
const HOMES = startPointOptions(CAMPUS_POIS, []).filter((option) => option.startPoint.kind === 'building');

/** On-Campus Residence (US-04): where you live, saved and used as your start point. */
export default function ResidenceScreen() {
  const home = useHome();

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'On-Campus Residence' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            Where you live. Routes start here, and the start picker lists it as Home.
          </ThemedText>
          <OptionRow label="None" selected={!home} onPress={() => homeStore.set(null)} />
          {HOMES.map((option, index) => (
            <Fragment key={option.key}>
              {index === 0 || HOMES[index - 1].group !== option.group ? (
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.heading}>
                  {option.group}
                </ThemedText>
              ) : null}
              <OptionRow
                label={option.label}
                selected={option.startPoint.kind === 'building' && option.startPoint.poiId === home}
                onPress={() => {
                  if (option.startPoint.kind !== 'building') return;
                  homeStore.set(option.startPoint.poiId);
                  setStartPoint(option.startPoint);
                }}
              />
            </Fragment>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  description: { marginBottom: Spacing.two },
  heading: { marginTop: Spacing.three },
});
