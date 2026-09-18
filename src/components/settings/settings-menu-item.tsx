import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type SettingsMenuItemProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

// disabled=true renders a dimmed, non-interactive row rather than faking a
// destination screen — the wireframe names these but nothing behind them is
// built yet (Iteration 2+), and a dead-end "coming soon" page isn't clearer
// than an honestly-disabled row.
export function SettingsMenuItem({ label, onPress, disabled }: SettingsMenuItemProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={disabled ? styles.disabled : undefined}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText themeColor={disabled ? 'textSecondary' : 'text'}>{label}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  disabled: {
    opacity: 0.6,
  },
});
