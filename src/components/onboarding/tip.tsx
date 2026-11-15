import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { overlaySurface } from '@/components/map/map-legend';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dismissTip, useShowTip, type TipId } from '@/state/onboarding';

/**
 * A one-time tip where a hidden feature is (long-press, the start chip...). Shows after the welcome
 * until "Got it"; Settings > How to use Mavigator shows them again. The caller places it.
 */
export function Tip({ id, text, style }: { id: TipId; text: string; style?: StyleProp<ViewStyle> }) {
  const show = useShowTip(id);
  const theme = useTheme();
  if (!show) return null;

  return (
    <View accessibilityRole="alert" style={[styles.tip, overlaySurface(theme.backgroundElement), style]}>
      <ThemedText type="small" style={styles.text}>
        {text}
      </ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel="Got it, hide this tip" onPress={() => dismissTip(id)} hitSlop={8}>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          Got it
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#F58025',
  },
  text: { flex: 1 },
});
