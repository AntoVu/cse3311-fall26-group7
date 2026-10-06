import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DirectionStep } from '@/routing/directions';
import { formatDistance } from '@/routing/format';

type RouteDirectionsProps = { steps: DirectionStep[] };

/**
 * The route's text directions behind a "Directions (N steps)" toggle. Closed by default so the
 * map keeps its room; open, the list scrolls inside a fixed height for the same reason.
 */
export function RouteDirections({ steps }: RouteDirectionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (steps.length === 0) return null;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        hitSlop={8}>
        <ThemedText type="linkPrimary">
          {isOpen ? '▾' : '▸'} Directions ({steps.length} steps)
        </ThemedText>
      </Pressable>
      {isOpen ? (
        <ScrollView style={styles.list}>
          {steps.map((step, index) => (
            <View key={index} style={styles.step}>
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
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 180, marginTop: Spacing.one },
  step: { flexDirection: 'row', gap: Spacing.two, paddingVertical: 2 },
  number: { width: 22 },
  text: { flex: 1 },
});
