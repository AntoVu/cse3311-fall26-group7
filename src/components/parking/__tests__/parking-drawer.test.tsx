import { act } from 'react';
import renderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ParkingDrawer } from '@/components/parking/parking-drawer';
import { Chip } from '@/components/ui/chip';
import { ScheduleProvider } from '@/context/schedule-context';
import { NO_PERMIT } from '@/constants/parking-permits';

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

describe('ParkingDrawer', () => {
  it('shows the best-lot summary when no lot is tapped', () => {
    const tree = render();
    expect(texts(tree)).toContain('Choose your parking pass');
    expect(tree.root.findAllByType(Chip)).toHaveLength(0);
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
    const clear = tree.root.findAllByType(Chip).find((chip) => chip.props.label === 'Show best lots')!;
    act(() => clear.props.onPress());
    expect(onClearLot).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });
});
