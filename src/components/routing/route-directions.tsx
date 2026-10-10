import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DirectionStep } from '@/routing/directions';
import { formatDistance } from '@/routing/format';

type DirectionListProps = {
  steps: DirectionStep[];
  /** Makes each step tappable (the indoor screen shows that step's floor). */
  onPressStep?: (step: DirectionStep) => void;
};

/**
 * A route's text directions, numbered, scrolling inside a fixed height so the map keeps its
 * room. Shown in a route screen's drawer, which is what opens and closes it.
 */
export function DirectionList({ steps, onPressStep }: DirectionListProps) {
  if (steps.length === 0) return null;

  return (
    <ScrollView style={styles.list}>
      {steps.map((step, index) => (
        <Pressable
          key={index}
          disabled={!onPressStep}
          onPress={() => onPressStep?.(step)}
          style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.number}>
            {index + 1}.
          </ThemedText>
          <ThemedText type="small" style={styles.text}>
            {step.text}
          </ThemedText>
          {step.distanceMeters > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {formatDistance(step.distanceMeters)}
            </ThemedText>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 220 },
  step: { flexDirection: 'row', gap: Spacing.two, paddingVertical: 3 },
  number: { width: 22 },
  text: { flex: 1 },
  pressed: { opacity: 0.5 },
});
