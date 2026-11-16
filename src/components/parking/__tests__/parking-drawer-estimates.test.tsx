import { act } from 'react';
import { Dimensions, ScrollView, Text } from 'react-native';
import renderer from 'react-test-renderer';

import { ParkingDrawer } from '@/components/parking/parking-drawer';
import { LegendRow } from '@/components/map/map-legend';
import { LotRow, useParkingRecommendation } from '@/components/parking/parking-recommendation-card';
import { PARKING_ESTIMATE_COLORS } from '@/constants/parking-crowding';
import { PARKING_DISCLAIMER } from '@/constants/parking-permits';
import type { CampusLot } from '@/types/map';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('@/components/parking/parking-recommendation-card', () => ({
  useParkingRecommendation: jest.fn(() => ({ nextClass: null, recommendations: [], note: 'No class left today.', crowdWarning: null })),
  LotRow: () => null,
}));

function texts(tree: renderer.ReactTestRenderer) {
  return tree.root.findAllByType(Text).map((node) => [node.props.children].flat().join(''));
}

it('shows the estimate labels in the legend chip, and the disclaimer only in the open drawer', () => {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<ParkingDrawer permitLabel="West Commuter" onClearLot={jest.fn()} onSelectLot={jest.fn()} onOpenPermit={jest.fn()} />);
  });
  act(() => {
    tree!.root.findAll((node) => node.props.accessibilityLabel === 'Show legend')[0].props.onPress();
  });
  expect(texts(tree!)).toEqual(expect.arrayContaining([
    'Permitted · estimated low crowding',
    'Permitted · estimated moderate crowding',
    'Permitted · estimated heavy crowding',
    'Not allowed for this permit or time',
  ]));
  // Weekends are quiet, not unknown: there is no purple row any more.
  const colors = tree!.root.findAllByType(LegendRow).map((row) => row.props.color);
  expect(colors).not.toContain('#A855F7');
  expect(colors).toContain(PARKING_ESTIMATE_COLORS.low);

  expect(texts(tree!)).not.toContain(PARKING_DISCLAIMER);
  act(() => {
    tree!.root.findAll((node) => node.props.accessibilityLabel === 'Open parking details')[0].props.onPress();
  });
  expect(texts(tree!)).toContain(PARKING_DISCLAIMER);
  act(() => tree!.unmount());
});

it('keeps the recommendation list short on a short screen, and shows the crowd warning', () => {
  const previousWindow = Dimensions.get('window');
  Dimensions.set({ window: { width: 320, height: 400, scale: 1, fontScale: 1 } });
  jest.mocked(useParkingRecommendation).mockReturnValue({
    target: undefined,
    nextClass: undefined,
    destination: undefined,
    recommendations: [34, 36, 52].map((id) => ({
      lot: { id: `lot-${id}`, label: `Lot ${id}` } as CampusLot,
      walkMeters: 100,
      walkMinutes: 1,
      crowding: 'heavy' as const,
    })),
    note: null,
    crowdWarning: 'These lots are likely full around then. Leave extra time to find a space.',
  });
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<ParkingDrawer permitLabel="West Commuter" onClearLot={jest.fn()} onSelectLot={jest.fn()} onOpenPermit={jest.fn()} />);
  });
  expect(texts(tree!)).toContain('These lots are likely full around then. Leave extra time to find a space.');
  act(() => {
    tree!.root.findAll((node) => node.props.accessibilityLabel === 'Open parking details')[0].props.onPress();
  });
  const scroll = tree!.root.findAllByType(ScrollView).find((node) => node.props.accessibilityLabel === 'Parking recommendations')!;
  expect(scroll.props.style.maxHeight).toBeLessThanOrEqual(80);
  expect(scroll.findAllByType(LotRow)).toHaveLength(3);
  expect(texts(tree!)).toContain(PARKING_DISCLAIMER);
  act(() => tree!.unmount());
  Dimensions.set({ window: previousWindow });
});
