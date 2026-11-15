import { act } from 'react';
import renderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ParkingDrawer } from '@/components/parking/parking-drawer';
import { ScheduleProvider } from '@/context/schedule-context';
import { NO_PERMIT } from '@/constants/parking-permits';
import { parkingPermitStore } from '@/state/parking-permit';
import { parkingTargetStore } from '@/state/parking-target';

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
// A Monday morning, so the mock schedule has classes left.
const NOW = new Date(2026, 10, 9, 8, 0);

function render(props: Partial<React.ComponentProps<typeof ParkingDrawer>> = {}) {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ScheduleProvider initialTime={NOW}>
          <ParkingDrawer permitLabel={NO_PERMIT} onClearLot={jest.fn()} onSelectLot={jest.fn()} onOpenPermit={jest.fn()} {...props} />
        </ScheduleProvider>
      </SafeAreaProvider>
    );
  });
  return tree!;
}

// Every string rendered, so the test reads the drawer the way a user would.
function texts(tree: renderer.ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: renderer.ReactTestRendererJSON | renderer.ReactTestRendererJSON[] | string | null) => {
    if (!node) return;
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else node.children?.forEach(walk);
  };
  walk(tree.toJSON());
  return out.join(' ');
}

const CARD = { title: 'Lot F12', status: 'Not with your pass until 7 PM.', walk: '8 min walk to PHYS 1444 (708 m)' };

const NEDDERMAN = 'academic-nedderman-hall';

describe('ParkingDrawer', () => {
  afterEach(() => {
    parkingTargetStore.set(null);
    parkingPermitStore.set(NO_PERMIT);
  });

  it('plans for a building picked on the map, with a chip that clears it', () => {
    parkingPermitStore.set('West Commuter');
    parkingTargetStore.set(NEDDERMAN);
    const tree = render({ permitLabel: 'West Commuter' });
    expect(texts(tree)).toContain('For Nedderman Hall ✕');
    expect(texts(tree)).toMatch(/Best: .+ walk/);
    const chip = tree.root.findByProps({ accessibilityLabel: 'Parking for Nedderman Hall. Tap to plan for your next class instead.' });
    act(() => chip.props.onPress());
    expect(parkingTargetStore.get()).toBeNull();
    expect(texts(tree)).not.toContain('For Nedderman Hall ✕');
    act(() => tree.unmount());
  });

  it('still recommends lots for a picked building when no class is left today', () => {
    parkingPermitStore.set('West Commuter');
    parkingTargetStore.set(NEDDERMAN);
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <ScheduleProvider initialTime={new Date(2026, 10, 9, 23, 0)}>
            <ParkingDrawer permitLabel="West Commuter" onClearLot={jest.fn()} onSelectLot={jest.fn()} onOpenPermit={jest.fn()} />
          </ScheduleProvider>
        </SafeAreaProvider>
      );
    });
    expect(texts(tree!)).toMatch(/Best: .+ walk/);
    expect(texts(tree!)).not.toContain('No class left today');
    act(() => tree!.unmount());
  });

  it('shows the best-lot summary when no lot is tapped', () => {
    const tree = render();
    expect(texts(tree)).toContain('Choose your parking pass');
    expect(texts(tree)).not.toContain('Show best lots');
    act(() => tree.unmount());
  });

  it('shows the tapped lot instead, with its status and walk', () => {
    const tree = render({ lotCard: CARD });
    const shown = texts(tree);
    expect(shown).toContain('Lot F12');
    expect(shown).toContain(CARD.status);
    expect(shown).toContain(CARD.walk);
    expect(shown).not.toContain('Choose your parking pass');
    act(() => tree.unmount());
  });

  it('shows the 1 PM notice under the pass chip only when given', () => {
    const NOTICE = 'Yellow lots open to your pass at 1 PM';
    const withNotice = render({ notice: NOTICE });
    expect(texts(withNotice)).toContain(NOTICE);
    act(() => withNotice.unmount());
    const without = render();
    expect(texts(without)).not.toContain(NOTICE);
    act(() => without.unmount());
  });

  it('"Show best lots" clears the tapped lot', () => {
    const onClearLot = jest.fn();
    const tree = render({ lotCard: CARD, onClearLot });
    const clear = tree.root.findByProps({ accessibilityRole: 'button', onPress: onClearLot });
    act(() => clear.props.onPress());
    expect(onClearLot).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });
});
