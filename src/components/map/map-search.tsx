import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { overlaySurface } from '@/components/map/map-legend';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseRoomQuery, searchBuildings } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { availableAmenities, matchAmenities, type AmenityId } from '@/routing/amenities';

type MapSearchProps = {
  /** A building was picked: open its card. */
  onPickBuilding: (buildingId: string) => void;
  /** "NH 340" was picked: route to that room. */
  onPickRoom: (buildingId: string, room: string) => void;
  /** "Nearest vending machine" was picked: route to the closest one. */
  onPickAmenity: (amenity: AmenityId) => void;
  /** The amenity the search is showing (null when none), so the map can badge the buildings that have it. */
  onShowAmenity?: (amenity: AmenityId | null) => void;
};

// Fixed for the session: which amenities any building has.
const AVAILABLE = new Set<string>(availableAmenities().map((amenity) => amenity.id));

/**
 * The Map tab's search pill: buildings by name, abbreviation or a name people use (building-aliases.ts),
 * "NH 340" straight to a room, and "vending" or "bathroom" to the nearest one. Results float under it
 * while typing.
 */
export function MapSearch({ onPickBuilding, onPickRoom, onPickAmenity, onShowAmenity }: MapSearchProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const room = parseRoomQuery(query);
  const results = query.trim() ? searchBuildings(query) : [];
  const amenities = matchAmenities(query);
  const found = amenities.filter((amenity) => AVAILABLE.has(amenity.id));
  const missing = amenities.filter((amenity) => !AVAILABLE.has(amenity.id));

  const change = (text: string) => {
    setQuery(text);
    onShowAmenity?.(matchAmenities(text).find((amenity) => AVAILABLE.has(amenity.id))?.id ?? null);
  };
  const done = () => {
    change('');
    Keyboard.dismiss();
  };

  return (
    <View>
      <View style={[styles.pill, overlaySurface(theme.backgroundElement)]}>
        <TextInput
          // 16 px keeps iOS Safari from zooming the page in on focus.
          style={[styles.input, { color: theme.text }]}
          placeholder="Search buildings, rooms or restrooms"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={change}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="search"
          accessibilityLabel="Search buildings, rooms or restrooms"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={done} hitSlop={8}>
            <ThemedText themeColor="textSecondary">✕</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {query.trim() ? (
        <View style={[styles.results, overlaySurface(theme.backgroundElement)]}>
          {room ? (
            <Result
              title={`Route to ${room.building.abbreviation ?? room.building.name} ${room.room}`}
              detail={room.building.name}
              onPress={() => {
                done();
                onPickRoom(room.building.id, room.room);
              }}
            />
          ) : null}
          {found.map((amenity) => (
            <Result
              key={amenity.id}
              title={`Nearest ${amenity.label.toLowerCase()}`}
              detail="From your starting point"
              onPress={() => {
                done();
                onPickAmenity(amenity.id);
              }}
            />
          ))}
          {missing.map((amenity) => (
            <ThemedText key={amenity.id} type="small" themeColor="textSecondary" style={styles.row}>
              No {amenity.plural} are on the indoor maps yet.
            </ThemedText>
          ))}
          {results.map((building) => (
            <Result
              key={building.id}
              title={building.name}
              detail={building.description}
              onPress={() => {
                done();
                onPickBuilding(building.id);
              }}
            />
          ))}
          {!room && results.length === 0 && amenities.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.row}>
              No building by that name
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Result({ title, detail, onPress }: { title: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <ThemedText type="smallBold" numberOfLines={1}>
        {title}
      </ThemedText>
      {detail ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {detail}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  // No browser focus ring: the pill is the field, and the caret shows it's focused.
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.two + 2, outlineWidth: 0 },
  results: { marginTop: Spacing.two, borderRadius: 16, paddingVertical: Spacing.one },
  row: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
