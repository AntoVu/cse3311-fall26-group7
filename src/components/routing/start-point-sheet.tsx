import { Fragment, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { CAMPUS_LOTS } from '@/data/campus-lots';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { useTheme } from '@/hooks/use-theme';
import { filterStartPointOptions, startPointOptions, type StartPoint } from '@/routing/start-point';
import { useHome } from '@/state/home';
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

  const theme = useTheme();
  const [query, setQuery] = useState('');
  const home = useHome();
  const allOptions = useMemo(() => startPointOptions(CAMPUS_POIS, CAMPUS_LOTS, home), [home]);
  const options = filterStartPointOptions(allOptions, query);
  // Closing clears the search, so the sheet opens to the full list next time.
  const close = () => {
    setQuery('');
    onClose();
  };

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
    <BottomSheet visible={visible} title="Start From" onClose={close}>
      <TextInput
        style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        placeholder="Search buildings and lots"
        placeholderTextColor={theme.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        accessibilityLabel="Search buildings and lots"
      />
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
                close();
              }}
            />
          </Fragment>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  // 16 px text, so iPhone Safari doesn't zoom the page when the box is tapped.
  search: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: 10, fontSize: 16 },
  heading: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
});
