import { Modal, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { PointOfInterest } from '@/types/map';

const CATEGORY_LABELS: Record<PointOfInterest['category'], string> = {
  academic: 'Academic building',
  residence: 'On-campus residence',
  apartment: 'Nearby apartment',
};

type PoiInfoSheetProps = {
  poi: PointOfInterest | null;
  onClose: () => void;
};

// Plain Modal, no bottom-sheet library — good enough for Iteration 1.
export function PoiInfoSheet({ poi, onClose }: PoiInfoSheetProps) {
  return (
    <Modal visible={poi !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <ThemedView type="backgroundElement" style={styles.sheet}>
            {poi && (
              <>
                <ThemedText type="subtitle">{poi.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {CATEGORY_LABELS[poi.category]}
                  {poi.buildingCode ? ` · ${poi.buildingCode}` : ''}
                </ThemedText>
                {poi.description ? <ThemedText type="small">{poi.description}</ThemedText> : null}
                {/* Stub — wired up to real routing in a later iteration. */}
                <Pressable style={styles.destinationButton} disabled>
                  <ThemedText type="link">Set as destination</ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    padding: Spacing.four,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    gap: Spacing.two,
  },
  destinationButton: {
    marginTop: Spacing.two,
    opacity: 0.5,
  },
});
