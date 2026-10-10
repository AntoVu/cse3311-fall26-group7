import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MAP_OVERLAY_BOTTOM, overlaySurface } from '@/components/map/map-legend';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** How far floating controls sit from the screen's edges (and below the status bar). */
export const OVERLAY_EDGE = 12;

/** A pill that floats over a full-screen map (the Parking pass chip, a route screen's back button). */
export function OverlayChip({
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        overlaySurface(theme.backgroundElement),
        pressed && styles.pressed,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

/**
 * The sheet along the bottom of a full-screen map: a handle and a short summary while closed,
 * more below it when open. Tapping the summary opens and closes it.
 */
export function MapDrawer({
  open,
  onToggle,
  label,
  header,
  footer,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  /** What the summary is, for screen readers: "parking details", "directions". */
  label: string;
  /** The summary, shown open or closed. */
  header: ReactNode;
  /** Always shown under the summary, outside the toggle (e.g. a button). */
  footer?: ReactNode;
  /** Shown only while open. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  // ponytail: tap to open only; add a drag gesture if people try to drag it.
  return (
    <View style={[styles.drawer, overlaySurface(theme.backgroundElement)]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? `Close ${label}` : `Open ${label}`}
        onPress={onToggle}
        style={styles.header}>
        <View style={[styles.handle, { backgroundColor: theme.textSecondary }]} />
        {header}
      </Pressable>
      {footer}
      {open && children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  pressed: { opacity: 0.7 },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: MAP_OVERLAY_BOTTOM,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingBottom: OVERLAY_EDGE,
  },
  header: {
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
  body: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
});
