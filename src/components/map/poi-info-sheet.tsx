import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BuildingPreview } from '@/components/map/building-preview';
import { FloorPicker } from '@/components/map/floor-picker';
import { IndoorMapView } from '@/components/map/indoor-map-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Chip } from '@/components/ui/chip';
import { POI_CATEGORY_LABELS } from '@/constants/poi-categories';
import { Spacing } from '@/constants/theme';
import { INDOOR_FLOOR_PLANS, INDOOR_NODES } from '@/data/campus-indoor';
import { campusGraph } from '@/routing/campus-graph';
import { buildingFloors, floorLabel } from '@/routing/floors';
import { findRoomNode, hasIndoorMap } from '@/routing/rooms';
import type { PointOfInterest } from '@/types/map';

type PoiInfoSheetProps = {
  poi: PointOfInterest | null;
  onClose: () => void;
  /** The building, or one of its rooms picked in the inside view. */
  onSetDestination: (poi: PointOfInterest, room?: string) => void;
};

// Plain Modal, no bottom-sheet library: the building fills the dark area above the sheet.
export function PoiInfoSheet({ poi, onClose, onSetDestination }: PoiInfoSheetProps) {
  return (
    <Modal visible={poi !== null} transparent animationType="slide" onRequestClose={onClose}>
      {/* Gestures inside a Modal need their own root on native (the indoor map pans and pinches). */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} />
        {/* Keyed by building, so its floor and picked room start fresh for each one. */}
        {poi ? <PoiInfo key={poi.id} poi={poi} onSetDestination={onSetDestination} /> : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

function PoiInfo({ poi, onSetDestination }: Pick<PoiInfoSheetProps, 'onSetDestination'> & { poi: PointOfInterest }) {
  const hasInside = hasIndoorMap(campusGraph, poi.id);
  const levels = hasInside ? buildingFloors(INDOOR_NODES, INDOOR_FLOOR_PLANS[poi.id], poi.id) : [];
  const [inside, setInside] = useState(false);
  const [floor, setFloor] = useState(levels.includes('1') ? '1' : levels[0]);
  const [room, setRoom] = useState<string | null>(null);
  const routable = room ? findRoomNode(campusGraph, poi.id, room) !== null : false;

  return (
    <>
      {/* Taps outside the drawing fall through to the backdrop and close the sheet. */}
      <View pointerEvents="box-none" style={styles.previewArea}>
        {inside ? (
          <View style={styles.inside}>
            <IndoorMapView
              building={poi}
              level={floor}
              highlightRooms={room ? { destination: room } : undefined}
              onPressRoom={setRoom}
            />
            <FloorPicker
              levels={levels}
              selected={floor}
              onSelect={(level) => {
                setFloor(level);
                setRoom(null);
              }}
              style={styles.floorPicker}
            />
          </View>
        ) : (
          <BuildingPreview poi={poi} />
        )}
      </View>
      <ThemedView type="backgroundElement" style={styles.sheet}>
        <ThemedText type="subtitle">{poi.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {POI_CATEGORY_LABELS[poi.category]}
          {poi.abbreviation ? ` · ${poi.abbreviation}` : ''}
        </ThemedText>
        {poi.description ? <ThemedText type="small">{poi.description}</ThemedText> : null}
        {hasInside ? (
          <View accessibilityRole="radiogroup" style={styles.toggle}>
            <Chip label="Outside" selected={!inside} onPress={() => setInside(false)} />
            <Chip label="Inside" selected={inside} onPress={() => setInside(true)} />
          </View>
        ) : null}
        {inside ? (
          <ThemedText type="small" themeColor="textSecondary">
            {room
              ? `Room ${room} · ${floorLabel(floor)}${routable ? '' : ' · not routable yet'}`
              : 'Tap a room to go there.'}
          </ThemedText>
        ) : null}
        {inside && room && routable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Set Room ${room} as destination`}
            style={styles.destinationButton}
            onPress={() => onSetDestination(poi, room)}>
            <ThemedText type="link">Set Room {room} as destination</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Set ${poi.name} as destination`}
            style={styles.destinationButton}
            onPress={() => onSetDestination(poi)}>
            <ThemedText type="link">Set as destination</ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  previewArea: {
    flex: 1,
    justifyContent: 'center',
  },
  inside: {
    flex: 1,
    margin: Spacing.three,
    marginTop: Spacing.six,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  floorPicker: { top: Spacing.two, right: Spacing.two },
  sheet: {
    padding: Spacing.four,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    gap: Spacing.two,
  },
  toggle: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  destinationButton: {
    marginTop: Spacing.two,
  },
});
