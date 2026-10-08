// TEMPORARY: the candidate layouts for "buttons and cards cover too much of the map", switched
// from Settings > Developer. Once one is picked, keep it and delete the rest of this file.
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapLegend, overlaySurface } from '@/components/map/map-legend';
import { ParkingMapLegend } from '@/components/map/parking-map-legend';
import { LotRow, useParkingRecommendation } from '@/components/parking/parking-recommendation-card';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { NO_PERMIT } from '@/constants/parking-permits';
import { Spacing } from '@/constants/theme';
import { buildingName } from '@/data/buildings';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/routing/format';
import type { OverlayLayout } from '@/state/dev-options';
import type { CampusLot } from '@/types/map';

// The native tab bar floats over the screen; the web one sits below it.
const BOTTOM_INSET = Platform.OS === 'web' ? 0 : 85;
const EDGE = 12;

/** Layouts that let the map run up under the status bar. */
export function isFullBleed(layout: OverlayLayout) {
  return layout === 'floating' || layout === 'drawer' || layout === 'buttons';
}

type ParkingOverlayProps = {
  layout: OverlayLayout;
  permitLabel: string;
  selectedLotId?: string;
  onSelectLot: (lot: CampusLot) => void;
  onOpenPermit: () => void;
};

// ---------------------------------------------------------------- shared pieces

function useBestLine() {
  const { nextClass, recommendations, note } = useParkingRecommendation();
  const best = recommendations[0];
  return {
    headline: best ? `Best: ${best.lot.label} · ${formatDuration(best.walkMinutes)} walk` : null,
    classLine:
      nextClass && best
        ? `For ${nextClass.courseCode} at ${nextClass.startTime} · ${buildingName(nextClass.buildingId)}`
        : null,
    note,
  };
}

function LotList({
  selectedLotId,
  onSelectLot,
}: Pick<ParkingOverlayProps, 'selectedLotId' | 'onSelectLot'>) {
  const { recommendations } = useParkingRecommendation();
  return (
    <View>
      {recommendations.map((recommendation, index) => (
        <LotRow
          key={recommendation.lot.id}
          recommendation={recommendation}
          best={index === 0}
          selected={recommendation.lot.id === selectedLotId}
          onPress={() => onSelectLot(recommendation.lot)}
        />
      ))}
    </View>
  );
}

function PassChip({
  permitLabel,
  onPress,
  floating,
}: {
  permitLabel: string;
  onPress: () => void;
  floating?: boolean;
}) {
  const theme = useTheme();
  const none = permitLabel === NO_PERMIT;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Selected pass: ${permitLabel}. Tap to change it.`}
      onPress={onPress}
      style={[
        styles.passChip,
        floating
          ? overlaySurface(theme.backgroundElement)
          : { backgroundColor: theme.backgroundElement },
      ]}>
      <ThemedText type="smallBold" numberOfLines={1}>
        {none ? 'Choose a pass' : permitLabel} ▾
      </ThemedText>
    </Pressable>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {open ? '▴' : '▾'}
    </ThemedText>
  );
}

/** Pinned to the bottom-left corner of the map, clear of the tab bar. */
function CornerLegend({ children }: { children: ReactNode }) {
  return (
    <View pointerEvents="box-none" style={styles.cornerLegend}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- Compact

/** One row above the map: the pass on the left, the answer on the right. */
export function CompactParkingBar(props: Omit<ParkingOverlayProps, 'layout'>) {
  const [open, setOpen] = useState(false);
  const { headline, classLine, note } = useBestLine();

  return (
    <View style={styles.compactBar}>
      <View style={styles.compactRow}>
        <PassChip permitLabel={props.permitLabel} onPress={props.onOpenPermit} />
        {headline ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((current) => !current)}
            style={styles.compactBest}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.shrink}>
              {headline}
            </ThemedText>
            <Chevron open={open} />
          </Pressable>
        ) : null}
      </View>
      {!headline && note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}
      {open ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {classLine}
          </ThemedText>
          <LotList selectedLotId={props.selectedLotId} onSelectLot={props.onSelectLot} />
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Floating

function FloatingParkingCard(props: Omit<ParkingOverlayProps, 'layout'>) {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { headline, classLine, note } = useBestLine();
  const none = props.permitLabel === NO_PERMIT;

  return (
    <View
      style={[styles.floatingCard, overlaySurface(theme.backgroundElement), { top: top + EDGE }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => (headline ? setOpen((current) => !current) : props.onOpenPermit())}
        style={styles.floatingHeader}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.shrink}>
          {headline ?? (none ? 'Choose your parking pass' : note)}
        </ThemedText>
        {headline ? <Chevron open={open} /> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Selected pass: ${props.permitLabel}. Tap to change it.`}
        onPress={props.onOpenPermit}
        style={styles.floatingPass}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {none ? 'No pass selected' : `${props.permitLabel} pass`}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.text }}>
          Change
        </ThemedText>
      </Pressable>
      {open ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {classLine}
          </ThemedText>
          <LotList selectedLotId={props.selectedLotId} onSelectLot={props.onSelectLot} />
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- Drawer

function ParkingDrawer(props: Omit<ParkingOverlayProps, 'layout'>) {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { headline, classLine, note } = useBestLine();
  const none = props.permitLabel === NO_PERMIT;

  return (
    <>
      <View pointerEvents="box-none" style={[styles.topLeft, { top: top + EDGE }]}>
        <PassChip permitLabel={props.permitLabel} onPress={props.onOpenPermit} floating />
      </View>
      {/* ponytail: tap to open, no drag gesture; add a pan handler if people try to drag it. */}
      <View style={[styles.drawer, overlaySurface(theme.backgroundElement)]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? 'Close parking details' : 'Open parking details'}
          onPress={() => setOpen((current) => !current)}
          style={styles.drawerHeader}>
          <View style={[styles.handle, { backgroundColor: theme.textSecondary }]} />
          <ThemedText type="smallBold" numberOfLines={1}>
            {headline ?? (none ? 'Choose your parking pass' : note)}
          </ThemedText>
          {classLine ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {classLine}
            </ThemedText>
          ) : null}
        </Pressable>
        {open ? (
          <View style={styles.drawerBody}>
            <LotList selectedLotId={props.selectedLotId} onSelectLot={props.onSelectLot} />
            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />
            <ParkingMapLegend variant="plain" />
          </View>
        ) : null}
      </View>
    </>
  );
}

// ---------------------------------------------------------------- Buttons

function RoundButton({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.roundButton, overlaySurface(theme.backgroundElement)]}>
      <ThemedText type="smallBold">{glyph}</ThemedText>
    </Pressable>
  );
}

function ParkingButtons(props: Omit<ParkingOverlayProps, 'layout'>) {
  const theme = useTheme();
  const { top } = useSafeAreaInsets();
  const [sheet, setSheet] = useState<'lots' | 'legend' | null>(null);
  const { recommendations, note } = useParkingRecommendation();
  const { classLine } = useBestLine();
  const selected = recommendations.find((r) => r.lot.id === props.selectedLotId);

  return (
    <>
      <View pointerEvents="box-none" style={[styles.buttonColumn, { top: top + EDGE }]}>
        <RoundButton glyph="P" label="Parking pass" onPress={props.onOpenPermit} />
        <RoundButton glyph="★" label="Where to park" onPress={() => setSheet('lots')} />
        <RoundButton glyph="?" label="Legend" onPress={() => setSheet('legend')} />
      </View>

      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hide this walk"
          onPress={() => props.onSelectLot(selected.lot)}
          style={[
            styles.selectedChip,
            overlaySurface(theme.backgroundElement),
            { top: top + EDGE },
          ]}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {selected.lot.label} · {formatDuration(selected.walkMinutes)} walk ✕
          </ThemedText>
        </Pressable>
      ) : null}

      <BottomSheet visible={sheet === 'lots'} title="Where to park" onClose={() => setSheet(null)}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.sheetNote}>
          {classLine ?? note}
        </ThemedText>
        <LotList
          selectedLotId={props.selectedLotId}
          onSelectLot={(lot) => {
            props.onSelectLot(lot);
            setSheet(null);
          }}
        />
      </BottomSheet>
      <BottomSheet visible={sheet === 'legend'} title="Legend" onClose={() => setSheet(null)}>
        <ParkingMapLegend variant="plain" />
      </BottomSheet>
    </>
  );
}

// ---------------------------------------------------------------- entry points

/** Everything that floats over the Parking tab's map. Compact's bar sits above the map instead. */
export function ParkingOverlay({ layout, ...props }: ParkingOverlayProps) {
  switch (layout) {
    case 'compact':
      return (
        <CornerLegend>
          <ParkingMapLegend variant="chip" />
        </CornerLegend>
      );
    case 'floating':
      return (
        <>
          <FloatingParkingCard {...props} />
          <CornerLegend>
            <ParkingMapLegend variant="chip" />
          </CornerLegend>
        </>
      );
    case 'drawer':
      return <ParkingDrawer {...props} />;
    case 'buttons':
      return <ParkingButtons {...props} />;
    default:
      return null;
  }
}

/** The Map tab's legend for each layout. */
export function MapLegendOverlay({ layout }: { layout: OverlayLayout }) {
  const [open, setOpen] = useState(false);

  if (layout === 'buttons') {
    // Bottom right, so it never sits under the dropped-pin banner at the top.
    return (
      <>
        <View pointerEvents="box-none" style={[styles.buttonColumn, styles.bottomRight]}>
          <RoundButton glyph="?" label="Legend" onPress={() => setOpen(true)} />
        </View>
        <BottomSheet visible={open} title="Legend" onClose={() => setOpen(false)}>
          <MapLegend variant="plain" />
        </BottomSheet>
      </>
    );
  }
  return (
    <CornerLegend>
      <MapLegend variant="chip" />
    </CornerLegend>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  passChip: {
    flexShrink: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  cornerLegend: {
    position: 'absolute',
    left: EDGE,
    right: EDGE,
    bottom: BOTTOM_INSET + EDGE,
  },
  compactBar: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  compactBest: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
  },
  floatingCard: {
    position: 'absolute',
    left: EDGE,
    right: EDGE,
    padding: Spacing.three,
    paddingVertical: 12,
    borderRadius: 16,
    gap: Spacing.one,
  },
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  floatingPass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  topLeft: {
    position: 'absolute',
    left: EDGE,
    right: 80,
    alignItems: 'flex-start',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_INSET,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
  },
  drawerHeader: {
    alignItems: 'center',
    gap: 2,
    paddingTop: Spacing.two,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
    marginBottom: Spacing.two,
  },
  drawerBody: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  divider: {
    height: 1,
  },
  buttonColumn: {
    position: 'absolute',
    right: EDGE,
    gap: Spacing.two,
  },
  bottomRight: {
    bottom: BOTTOM_INSET + EDGE,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    position: 'absolute',
    left: EDGE,
    maxWidth: '70%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  sheetNote: {
    marginBottom: Spacing.two,
  },
});
