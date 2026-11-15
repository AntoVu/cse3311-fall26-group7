import { act } from 'react';
import { Dimensions, ScrollView, Text } from 'react-native';
import renderer from 'react-test-renderer';

import { ParkingDrawer } from '@/components/parking/parking-drawer';
import { LegendRow } from '@/components/map/map-legend';
import { LotRow, useParkingRecommendation } from '@/components/parking/parking-recommendation-card';
import { PARKING_WARNING } from '@/constants/parking-crowding';
import type { CampusLot } from '@/types/map';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0 }) }));
jest.mock('@/components/parking/parking-recommendation-card', () => ({
  useParkingRecommendation: jest.fn(() => ({ nextClass: null, recommendations: [], note: 'No class left today.' })),
  LotRow: () => null,
}));

it('keeps the warning visible and opens estimate labels through the existing legend chip', () => {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<ParkingDrawer permitLabel="West Commuter" onClearLot={jest.fn()} onSelectLot={jest.fn()} onOpenPermit={jest.fn()} />);
  });
  expect(tree!.root.findAllByType(Text).map((node) => node.props.children)).toContain(PARKING_WARNING);
  act(() => {
    tree!.root.findAll((node) => node.props.accessibilityLabel === 'Show legend')[0].props.onPress();
  });
  const texts = tree!.root.findAllByType(Text).map((node) => [node.props.children].flat().join(''));
  expect(texts).toEqual(expect.arrayContaining([
    'Permitted · estimated low crowding',
    'Permitted · estimated moderate crowding',
    'Permitted · estimated heavy crowding',
    'Restricted for this permit or time',
    'Permitted · crowding unknown',
    'Lot not identified yet',
    PARKING_WARNING,
  ]));
  const unknown = tree!.root.findAllByType(LegendRow).find((row) => row.props.label === 'Permitted · crowding unknown');
  expect(unknown?.props.color).toBe('#A855F7');
  expect(tree!.root.findAll((node) => node.props.accessibilityLabel === 'Open parking details').length).toBeGreaterThan(0);
  act(() => tree!.unmount());
});

it('keeps main recommendation layout and warning reachable on a short screen', () => {
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
    })),
    note: null,
  });
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<ParkingDrawer permitLabel="West Commuter" onClearLot={jest.fn()} onSelectLot={jest.fn()} onOpenPermit={jest.fn()} />);
  });
  act(() => {
    tree!.root.findAll((node) => node.props.accessibilityLabel === 'Open parking details')[0].props.onPress();
  });
  const scroll = tree!.root.findAllByType(ScrollView).find((node) => node.props.accessibilityLabel === 'Parking recommendations')!;
  expect(scroll.props.style.maxHeight).toBeLessThanOrEqual(80);
  expect(scroll.findAllByType(LotRow)).toHaveLength(3);
  const warning = tree!.root.findAllByType(ScrollView).find((node) => node.props.accessibilityLabel === 'Parking warning')!;
  expect(warning.props.style.maxHeight).toBeLessThanOrEqual(72);
  expect(warning.findAllByType(Text).map((node) => node.props.children)).toContain(PARKING_WARNING);
  expect(tree!.root.findAll((node) => node.props.accessibilityLabel === 'Show legend').length).toBeGreaterThan(0);
  act(() => tree!.unmount());
  Dimensions.set({ window: previousWindow });
});
