import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BuildingPreview } from '@/components/map/building-preview';
import { FloorPicker } from '@/components/map/floor-picker';
import { IndoorMapView } from '@/components/map/indoor-map-view';
import {
  REPORT_ENDPOINT,
  REPORT_KINDS,
  reportIssueUrl,
  roomAt,
  sendReport,
  type MapReport,
  type ReportKind,
} from '@/components/map/map-report';
import { Tip } from '@/components/onboarding/tip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showAlert } from '@/components/ui/alert';
import { Chip } from '@/components/ui/chip';
import { POI_CATEGORY_LABELS } from '@/constants/poi-categories';
import { withOpacity } from '@/constants/schedule';
import { Spacing } from '@/constants/theme';
import { buildingAliasNames } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { hasIndoorData, useCampusGraph } from '@/routing/campus-graph';
import { buildingFloors, floorLabel } from '@/routing/floors';
import { findRoomNode } from '@/routing/rooms';
import type { Coordinate, PointOfInterest } from '@/types/map';

type PoiInfoSheetProps = {
  poi: PointOfInterest | null;
  onClose: () => void;
  /** The building, or one of its rooms picked in the inside view. */
  onSetDestination: (poi: PointOfInterest, room?: string) => void;
  /** The building's action, "Set as destination" by default (the Parking tab: "Park for this building"). */
  actionLabel?: string;
  /** No Inside view, for where only the building matters (parking doesn't depend on the room). */
  outdoorOnly?: boolean;
};

// Plain Modal, no bottom-sheet library. The building sits on its own card above the sheet; around
// it the map shows faintly through a backdrop in the theme's page color, which reads as "tap here to
// close". (A black backdrop in light mode used to let map labels bleed through, like a broken screen.)
export function PoiInfoSheet({ poi, onClose, onSetDestination, actionLabel, outdoorOnly }: PoiInfoSheetProps) {
  const theme = useTheme();
  return (
    <Modal visible={poi !== null} transparent animationType="slide" onRequestClose={onClose}>
      {/* Gestures inside a Modal need their own root on native (the indoor map pans and pinches). */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: withOpacity(theme.background, BACKDROP_OPACITY) }]} onPress={onClose} />
        {/* Keyed by building, so its floor and picked room start fresh for each one. */}
        {poi ? (
          <PoiInfo
            key={poi.id}
            poi={poi}
            onSetDestination={onSetDestination}
            onClose={onClose}
            actionLabel={actionLabel}
            outdoorOnly={outdoorOnly}
          />
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

function PoiInfo({
  poi,
  onSetDestination,
  onClose,
  actionLabel = 'Set as destination',
  outdoorOnly = false,
}: Pick<PoiInfoSheetProps, 'onSetDestination' | 'onClose' | 'actionLabel' | 'outdoorOnly'> & { poi: PointOfInterest }) {
  const hasInside = !outdoorOnly && hasIndoorData(poi.id);
  const aliasNames = buildingAliasNames(poi.id);
  const dragY = useSharedValue(0);
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dragY.get() }] }));
  // Loaded as the popup opens, so Inside is usually ready by the time it is tapped.
  const { graph, ready, building } = useCampusGraph(hasInside ? poi.id : undefined);
  const data = building(poi.id);
  const levels = data ? buildingFloors(data.nodes, data.plans, poi.id) : [];
  const [inside, setInside] = useState(false);
  const [chosenFloor, setFloor] = useState<string | null>(null);
  const floor = chosenFloor ?? (levels.includes('1') ? '1' : levels[0]);
  const [room, setRoom] = useState<string | null>(null);
  const routable = room ? findRoomNode(graph, poi.id, room) !== null : false;
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  // Report a problem: what's wrong, where it is (a spot tapped on this floor) and an optional note.
  const [report, setReport] = useState<{ kind?: ReportKind; at?: Coordinate; note: string } | null>(null);
  // Off while reporting, so the capped sheet can scroll.
  const swipeDown = Gesture.Pan()
    .enabled(!report)
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      dragY.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > SWIPE_CLOSE_DISTANCE || event.velocityY > SWIPE_CLOSE_SPEED) scheduleOnRN(onClose);
      else dragY.set(withTiming(0));
    });
  const markedRoom = report?.at ? roomAt(data?.plans[floor]?.rooms ?? [], report.at) : undefined;

  const startReport = () => {
    setReport({ note: '' });
    if (hasInside) setInside(true);
  };
  const [sending, setSending] = useState(false);
  const submitReport = async () => {
    if (!report?.kind) return;
    // Only these fields leave the app; nothing about the person reporting.
    const filed: MapReport = {
      kind: report.kind,
      building: { id: poi.id, name: poi.name, ...(poi.abbreviation && { abbreviation: poi.abbreviation }) },
      ...(inside && { floor }),
      ...(markedRoom && { room: markedRoom }),
      ...(inside && report.at && { at: report.at }),
      note: report.note,
    };
    if (!REPORT_ENDPOINT) {
      void WebBrowser.openBrowserAsync(reportIssueUrl(filed));
      setReport(null);
      return;
    }
    setSending(true);
    const sent = await sendReport(filed);
    setSending(false);
    if (sent) {
      setReport(null);
      showAlert('Report sent', 'Thanks! The Mavigator team will take a look.');
    } else {
      showAlert("Couldn't send the report", 'Check your connection and try again in a minute.');
    }
  };

  return (
    <>
      {/* Taps around the card fall through to the backdrop and close the sheet. */}
      <View pointerEvents="box-none" style={styles.previewArea}>
        <ThemedView type="backgroundElement" style={styles.card}>
          {inside && !ready ? (
            <ThemedText type="small" style={styles.loading}>
              Loading the indoor map…
            </ThemedText>
          ) : inside ? (
            <View style={styles.inside}>
              <IndoorMapView
                building={poi}
                level={floor}
                highlightRooms={
                  report ? (markedRoom ? { destination: markedRoom } : undefined) : room ? { destination: room } : undefined
                }
                onPressRoom={report ? undefined : setRoom}
                onPressPoint={report ? (at) => setReport({ ...report, at }) : undefined}
                marker={report?.at}
              />
              <FloorPicker
                levels={levels}
                selected={floor}
                onSelect={(level) => {
                  setFloor(level);
                  setRoom(null);
                  if (report) setReport({ ...report, at: undefined });
                }}
                style={styles.floorPicker}
              />
            </View>
          ) : (
            <BuildingPreview poi={poi} />
          )}
        </ThemedView>
      </View>
      {/* While reporting, the sheet is capped and scrolls so the floor plan keeps most of the screen.
          Otherwise a swipe down on it closes the popup; it follows the finger and springs back if short. */}
      <GestureDetector gesture={swipeDown}>
      <Animated.View style={dragStyle}>
      <ThemedView
        type="backgroundElement"
        style={[styles.sheet, report && { maxHeight: screenHeight * REPORT_SHEET_FRACTION }]}>
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetBody}
          keyboardShouldPersistTaps="handled"
          // Only the capped report sheet scrolls; otherwise a vertical drag is the swipe to close.
          scrollEnabled={!!report}>
          {report ? (
            <ThemedText type="smallBold" numberOfLines={1}>
              Report a problem · {poi.name}
            </ThemedText>
          ) : (
            <>
              <ThemedText type="subtitle">{poi.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {POI_CATEGORY_LABELS[poi.category]}
                {poi.abbreviation ? ` · ${poi.abbreviation}` : ''}
              </ThemedText>
              {aliasNames.length ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Also called {aliasNames.join(', ')}
                </ThemedText>
              ) : null}
              {poi.description ? <ThemedText type="small">{poi.description}</ThemedText> : null}
            </>
          )}
          {hasInside ? (
            <View accessibilityRole="radiogroup" style={styles.toggle}>
              <Chip label="Outside" selected={!inside} onPress={() => setInside(false)} />
              <Chip label="Inside" selected={inside} onPress={() => setInside(true)} />
            </View>
          ) : null}
          {hasInside && !report ? <Tip id="building-inside" text="Tap Inside to see each floor, then tap a room to go there." /> : null}
          {report ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds}>
                {REPORT_KINDS.map((kind) => (
                  <Chip
                    key={kind.id}
                    label={kind.label}
                    selected={report.kind === kind.id}
                    onPress={() => setReport({ ...report, kind: kind.id })}
                  />
                ))}
              </ScrollView>
              {inside ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {report.at
                    ? `Marked on ${floorLabel(floor)}${markedRoom ? `, in Room ${markedRoom}` : ''}. Tap again to move it.`
                    : 'Tap the floor plan where it is. Pick the floor first.'}
                </ThemedText>
              ) : null}
              <TextInput
                style={[styles.note, { color: theme.text, backgroundColor: theme.background }]}
                multiline
                placeholder="What's wrong? (optional)"
                placeholderTextColor={theme.textSecondary}
                value={report.note}
                onChangeText={(note) => setReport({ ...report, note })}
                accessibilityLabel="Report details"
              />
              <View style={styles.reportActions}>
                <Pressable accessibilityRole="button" onPress={() => setReport(null)}>
                  <ThemedText type="link">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !report.kind || sending }}
                  disabled={!report.kind || sending}
                  onPress={() => void submitReport()}
                  style={(!report.kind || sending) && styles.dimmed}>
                  <ThemedText type="link">
                    {REPORT_ENDPOINT ? (sending ? 'Sending…' : 'Send report') : 'Open on GitHub'}
                  </ThemedText>
                </Pressable>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {REPORT_ENDPOINT
                  ? 'Goes privately to the Mavigator team. Only the building, the spot and your note are sent.'
                  : 'Opens a new GitHub issue for the Mavigator team to review. Submitting it needs a GitHub account.'}
              </ThemedText>
            </>
          ) : null}
          {!report && inside ? (
            <ThemedText type="small" themeColor="textSecondary">
              {room
                ? `Room ${room} · ${floorLabel(floor)}${routable ? '' : ' · not routable yet'}`
                : 'Tap a room to go there.'}
            </ThemedText>
          ) : null}
          {report ? null : inside && room && routable ? (
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
              accessibilityLabel={`${actionLabel}: ${poi.name}`}
              style={styles.destinationButton}
              onPress={() => onSetDestination(poi)}>
              <ThemedText type="link">{actionLabel}</ThemedText>
            </Pressable>
          )}
          {report ? null : (
            <Pressable accessibilityRole="button" onPress={startReport}>
              <ThemedText type="small" themeColor="textSecondary">
                Something wrong or missing here? Report a problem
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </ThemedView>
      </Animated.View>
      </GestureDetector>
    </>
  );
}

// How much of the map the backdrop hides: enough to quiet it, little enough to read as see-through.
const BACKDROP_OPACITY = 0.75;
// A swipe down this far, or this fast (px/s), closes the popup.
const SWIPE_CLOSE_DISTANCE = 80;
const SWIPE_CLOSE_SPEED = 800;
// The most of the screen the sheet may take while reporting.
const REPORT_SHEET_FRACTION = 0.4;

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  previewArea: { flex: 1 },
  // One card for Outside and Inside, so toggling doesn't change its size.
  card: {
    flex: 1,
    margin: Spacing.three,
    marginTop: Spacing.six,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  inside: { flex: 1 },
  floorPicker: { top: Spacing.two, right: Spacing.two },
  loading: { textAlign: 'center' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    overflow: 'hidden',
  },
  sheetScroll: { flexGrow: 0 },
  sheetBody: { padding: Spacing.four, gap: Spacing.two },
  toggle: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  destinationButton: {
    marginTop: Spacing.two,
  },
  kinds: { gap: Spacing.two },
  note: { borderRadius: 10, padding: Spacing.two, fontSize: 16, minHeight: 44, textAlignVertical: 'top' },
  reportActions: { flexDirection: 'row', justifyContent: 'space-between' },
  dimmed: { opacity: 0.4 },
});
