import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// The app's pull-up sheet: tap the dimmed backdrop or ✕ to close. Used by the Schedule tab's
// Add Class and the Parking tab's permit picker so both feel the same. Rendered in-tree rather
// than in a Modal, so it can sit over a tab screen without fighting the native tab bar.
export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  // Android doesn't inset a ScrollView for the keyboard; iOS does it itself via
  // automaticallyAdjustKeyboardInsets below.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close modal"
        style={styles.backdrop}
        onPress={onClose}
      />
      <SafeAreaView style={styles.sheetContainer} edges={['bottom']}>
        <ThemedView type="background" style={styles.sheet}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              style={styles.closeButton}
              onPress={onClose}>
              <ThemedText themeColor="textSecondary" style={styles.closeText}>
                ✕
              </ThemedText>
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Spacing.five + keyboardHeight },
            ]}>
            {children}
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.three,
    maxHeight: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  // 40 px and a larger ✕: the old 28 px one was hard to hit. Negative margin keeps the header's height.
  closeButton: {
    borderRadius: 20,
    minWidth: 40,
    minHeight: 40,
    marginVertical: -Spacing.one - 2,
    marginRight: -Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 20, lineHeight: 24 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
});
