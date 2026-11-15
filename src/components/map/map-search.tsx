import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { overlaySurface } from '@/components/map/map-legend';
import { OverlayChip } from '@/components/map/map-overlays';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { parseRoomQuery, searchBuildings } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { AMENITY_BADGE_COLOR, availableAmenities, matchAmenities, type AmenityId } from '@/routing/amenities';

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

// Fixed for the session: which amenities any building has (the info list shows these).
const AVAILABLE_LIST = availableAmenities();
const AVAILABLE = new Set<string>(AVAILABLE_LIST.map((amenity) => amenity.id));

/**
 * The Map tab's search pill: buildings by name, abbreviation or a name people use (building-aliases.ts),
 * "NH 340" straight to a room, and "vending" or "bathroom" to the nearest one. Results float under it
 * while typing.
 */
export function MapSearch({ onPickBuilding, onPickRoom, onPickAmenity, onShowAmenity }: MapSearchProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  // The ⓘ list: what can be searched, and every item, each tappable to find the nearest.
  const [infoOpen, setInfoOpen] = useState(false);
  const room = parseRoomQuery(query);
  const results = query.trim() ? searchBuildings(query) : [];
  const amenities = matchAmenities(query);
  const found = amenities.filter((amenity) => AVAILABLE.has(amenity.id));
  const missing = amenities.filter((amenity) => !AVAILABLE.has(amenity.id));

  const change = (text: string) => {
    setQuery(text);
    if (text) setInfoOpen(false);
    onShowAmenity?.(matchAmenities(text).find((amenity) => AVAILABLE.has(amenity.id))?.id ?? null);
  };
  const done = () => {
    change('');
    Keyboard.dismiss();
  };

  return (
    <View>
      <View style={styles.searchRow}>
        <View style={[styles.pill, overlaySurface(theme.backgroundElement)]}>
          <TextInput
            // 16 px keeps iOS Safari from zooming the page in on focus.
            style={[styles.input, { color: theme.text }]}
            placeholder="Search"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={change}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="search"
            accessibilityLabel="Search buildings, rooms and restrooms"
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={done} hitSlop={8}>
              <ThemedText themeColor="textSecondary">✕</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <OverlayChip
          accessibilityLabel={infoOpen ? 'Close what you can search for' : 'What can I search for?'}
          onPress={() => {
            Keyboard.dismiss();
            setInfoOpen((open) => !open);
          }}
          style={styles.infoButton}>
          <ThemedText type="smallBold" style={styles.infoText}>
            {infoOpen ? '✕' : 'i'}
          </ThemedText>
        </OverlayChip>
      </View>

      {infoOpen && !query ? (
        <View style={[styles.results, overlaySurface(theme.backgroundElement)]}>
          <View style={styles.row}>
            <ThemedText type="smallBold">Search for</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              A building by name, code or nickname (Nedderman Hall, NH, Planetarium)
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              A room by building code and number (NH 340)
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={styles.row}>
            Find the nearest
          </ThemedText>
          {AVAILABLE_LIST.map((amenity) => (
            <Pressable
              key={amenity.id}
              accessibilityRole="button"
              accessibilityLabel={`Nearest ${amenity.label.toLowerCase()}`}
              onPress={() => {
                setInfoOpen(false);
                onPickAmenity(amenity.id);
              }}
              style={({ pressed }) => [styles.itemRow, pressed && { opacity: 0.6 }]}>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{amenity.glyph}</ThemedText>
              </View>
              <ThemedText type="small">{amenity.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  infoButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0, borderRadius: 22 },
  infoText: { fontSize: 18, lineHeight: 22 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AMENITY_BADGE_COLOR,
  },
  badgeText: { color: '#ffffff', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
  },
  // No browser focus ring: the pill is the field, and the caret shows it's focused. Browsers draw an
  // "auto" ring at any width, so the style has to be none (react-native-web passes it; RN's types lack it).
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.two + 2 },
  results: { marginTop: Spacing.two, borderRadius: 16, paddingVertical: Spacing.one },
  row: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
