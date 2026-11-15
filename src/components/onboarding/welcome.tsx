import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withOpacity } from '@/constants/schedule';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { finishWelcome, useShowWelcome } from '@/state/onboarding';

const PAGES = [
  {
    title: 'Welcome to Mavigator',
    body: 'Find your way around UTA: any building, the room your class is in, and where your pass lets you park.',
  },
  {
    title: 'Set yourself up',
    body: 'Add your classes on the Schedule tab, or import them from MyMav in Settings. Pick your parking pass on the Parking tab. Mavigator then plans your walk and your parking.',
  },
  {
    title: 'Find anything',
    body: 'Search for a building, a room like NH 340, or the nearest restroom. Tap a building on the map to look inside. The i next to the search lists everything you can find.',
  },
];

/**
 * The first-launch welcome: three short pages, with Skip. Shown once, after the loading screen;
 * Settings > How to use Mavigator shows it again. Mounted once in _layout.tsx.
 */
export function Welcome() {
  const show = useShowWelcome();
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const close = () => {
    finishWelcome();
    setPage(0);
  };

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.backdrop, { backgroundColor: withOpacity(theme.background, 0.75) }]}>
        <ThemedView type="backgroundElement" style={styles.card}>
          {page === 0 ? (
            <Image source={require('@/assets/images/splash-icon.png')} style={styles.logo} resizeMode="contain" />
          ) : null}
          <ThemedText type="subtitle" style={styles.centered}>
            {PAGES[page].title}
          </ThemedText>
          <ThemedText style={styles.centered}>{PAGES[page].body}</ThemedText>

          <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
            {PAGES.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, { backgroundColor: index === page ? theme.text : theme.backgroundSelected }]}
              />
            ))}
          </View>

          <View style={styles.buttons}>
            {last ? <View /> : (
              <Pressable accessibilityRole="button" onPress={close} hitSlop={8}>
                <ThemedText themeColor="textSecondary">Skip</ThemedText>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => (last ? close() : setPage(page + 1))}
              style={({ pressed }) => [styles.next, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.nextText}>
                {last ? 'Get started' : 'Next'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three, maxWidth: 420, width: '100%', alignSelf: 'center' },
  logo: { width: 72, height: 72, alignSelf: 'center' },
  centered: { textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: 4 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  next: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 999 },
  nextText: { color: '#ffffff' },
  pressed: { opacity: 0.6 },
});
