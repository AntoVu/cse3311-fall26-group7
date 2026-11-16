import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OptionRow } from '@/components/ui/option-row';
import { Spacing } from '@/constants/theme';
import { classBuildingOptions, searchBuildings } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';

type BuildingPickerFieldProps = {
  /** The chosen building's POI id, or '' for none yet. */
  value: string;
  onChange: (buildingId: string) => void;
};

/** The list's height: about six rows, then it scrolls, so the form below stays in reach. */
const LIST_MAX_HEIGHT = 320;

/**
 * Picks the building a class is in, from the buildings actually on the map.
 *
 * This replaced a free-text box that accepted anything typed into it, which is why nothing
 * could route to a class. Expands inline rather than opening its own sheet: the form is often
 * already inside one (the Schedule tab's "+ Add Class"), and sheets within sheets fight over
 * the backdrop.
 */
export function BuildingPickerField({ value, onChange }: BuildingPickerFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const buildings = useMemo(() => classBuildingOptions(), []);
  const selected = buildings.find((building) => building.id === value);

  const matches = useMemo(() => {
    if (!query.trim()) return buildings;
    return searchBuildings(query, buildings.length);
  }, [buildings, query]);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Building"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((wasOpen) => !wasOpen)}
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText
          style={styles.fieldText}
          themeColor={selected ? 'text' : 'textSecondary'}
          numberOfLines={1}>
          {selected
            ? `${selected.name}${selected.abbreviation ? ` (${selected.abbreviation})` : ''}`
            : 'Select a building'}
        </ThemedText>
      </Pressable>

      {open ? (
        <View style={styles.list}>
          <TextInput
            style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Search buildings"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            accessibilityLabel="Search buildings"
          />
          <ScrollView
            style={styles.matches}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Buildings">
            {matches.map((building) => (
              <OptionRow
                key={building.id}
                label={building.name}
                description={building.description}
                selected={building.id === value}
                onPress={() => {
                  onChange(building.id);
                  setQuery('');
                  setOpen(false);
                }}
              />
            ))}
          </ScrollView>
          {matches.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No building by that name. Only buildings on the campus map can be chosen.
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    marginBottom: Spacing.two,
  },
  fieldText: { fontSize: 16 },
  list: { marginBottom: Spacing.two },
  matches: { maxHeight: LIST_MAX_HEIGHT },
  search: {
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: Spacing.one,
  },
  empty: { paddingVertical: Spacing.two },
});
