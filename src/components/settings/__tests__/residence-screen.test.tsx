import { act } from 'react';
import renderer from 'react-test-renderer';

import ResidenceScreen from '@/app/settings/profile/residence';
import { OptionRow } from '@/components/ui/option-row';
import { CAMPUS_POIS } from '@/data/campus-pois';
import { homeStore } from '@/state/home';
import { startPointStore } from '@/state/start-point';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));

function render() {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<ResidenceScreen />);
  });
  return tree!;
}

const rowsOf = (tree: renderer.ReactTestRenderer) => tree.root.findAllByType(OptionRow);
const row = (tree: renderer.ReactTestRenderer, label: string) =>
  rowsOf(tree).find((r) => r.props.label === label)!;

const HALL = CAMPUS_POIS.find((poi) => poi.category === 'residence')!;

describe('On-Campus Residence screen', () => {
  beforeEach(() => {
    homeStore.set(null);
    startPointStore.set(null);
  });

  it('lists None, then only residence halls and apartments', () => {
    const tree = render();
    const labels = rowsOf(tree).map((r) => r.props.label);
    const homes = CAMPUS_POIS.filter((poi) => poi.category === 'residence' || poi.category === 'apartment');

    expect(labels[0]).toBe('None');
    expect(labels.slice(1).sort()).toEqual(homes.map((poi) => poi.name).sort());
    expect(row(tree, 'None').props.selected).toBe(true);
    act(() => tree.unmount());
  });

  it('saves the picked hall as Home and starts routes there', () => {
    const tree = render();
    act(() => row(tree, HALL.name).props.onPress());

    expect(homeStore.get()).toBe(HALL.id);
    expect(startPointStore.get()).toEqual({ kind: 'building', poiId: HALL.id });
    expect(row(tree, HALL.name).props.selected).toBe(true);
    expect(row(tree, 'None').props.selected).toBe(false);
    act(() => tree.unmount());
  });

  it('None clears Home but leaves the start point alone', () => {
    homeStore.set(HALL.id);
    startPointStore.set({ kind: 'building', poiId: HALL.id });
    const tree = render();
    act(() => row(tree, 'None').props.onPress());

    expect(homeStore.get()).toBeNull();
    expect(startPointStore.get()).toEqual({ kind: 'building', poiId: HALL.id });
    act(() => tree.unmount());
  });
});
