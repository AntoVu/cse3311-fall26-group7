import { Fragment, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { startPointOptions, type StartPoint } from '@/routing/start-point';
import { setStartPoint, useStartPoint } from '@/state/start-point';
import { useLocationPermission, useUserLocation } from '@/state/user-location';

type StartPointSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/** Whether two stored start points mean the same place. */
function isSameStartPoint(a: StartPoint | null, b: StartPoint): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === 'building' && b.kind === 'building') return a.poiId === b.poiId;
  if (a.kind === 'lot' && b.kind === 'lot') return a.lotId === b.lotId;
  // Current location and a dropped pin are each a single choice.
  return a.kind !== 'building' && a.kind !== 'lot';
}

/**
 * Picks where a route starts (US-04). Pull-up sheet rather than a pushed screen, matching
 * "+ Add Class" and the parking permit picker.
 */
export function StartPointSheet({ visible, onClose }: StartPointSheetProps) {
  const selected = useStartPoint();
  const userLocation = useUserLocation();
  const permission = useLocationPermission();

  const options = useMemo(() => startPointOptions(CAMPUS_POIS, CAMPUS_LOTS), []);

  // Say why Current Location will not work, rather than letting it silently pick nothing.
  const locationNote =
    userLocation?.source === 'pinned'
      ? 'Using the pin you dropped on the map'
      : permission === 'denied'
        ? 'Location permission is off; long-press the map to drop a pin instead'
        : permission === 'unavailable'
          ? 'Location is unavailable here; long-press the map to drop a pin instead'
          : userLocation
            ? undefined
            : 'Waiting for a location fix';

  // Each row carries its own heading (or none), so rendering stays a pure map.
  const rows = options.map((option, index) => ({
    option,
    heading: index === 0 || options[index - 1].group !== option.group ? option.group : null,
  }));

  return (
    <BottomSheet visible={visible} title="Start From" onClose={onClose}>
      {rows.map(({ option, heading }) => {
        return (
          <Fragment key={option.key}>
            {heading ? (
              <View style={styles.heading}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {heading}
                </ThemedText>
              </View>
            ) : null}
            <OptionRow
              label={option.label}
              description={option.key === 'current' ? locationNote : undefined}
              selected={isSameStartPoint(selected, option.startPoint)}
              onPress={() => {
                setStartPoint(option.startPoint);
                onClose();
              }}
            />
          </Fragment>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
});
