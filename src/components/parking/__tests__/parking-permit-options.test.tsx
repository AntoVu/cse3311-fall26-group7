import { act } from 'react';
import renderer from 'react-test-renderer';

import { ParkingPermitOptions } from '@/components/parking/parking-permit-options';
import { ParkingPermitSheet } from '@/components/parking/parking-permit-sheet';
import { OptionRow } from '@/components/ui/option-row';
import { NO_PERMIT, PARKING_PERMIT_CHOICES } from '@/constants/parking-permits';
import { parkingPermitStore } from '@/state/parking-permit';

function render(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(element);
  });
  return tree!;
}

function rowsOf(tree: renderer.ReactTestRenderer) {
  return tree.root.findAllByType(OptionRow);
}

function selectedLabel(tree: renderer.ReactTestRenderer) {
  return rowsOf(tree).find((row) => row.props.selected)?.props.label;
}

describe('ParkingPermitOptions', () => {
  beforeEach(() => {
    parkingPermitStore.set(NO_PERMIT);
  });

  it('offers every choice and marks exactly the selected one', () => {
    const tree = render(<ParkingPermitOptions />);

    expect(rowsOf(tree).map((row) => row.props.label)).toEqual([...PARKING_PERMIT_CHOICES]);
    expect(rowsOf(tree).filter((row) => row.props.selected)).toHaveLength(1);
    expect(selectedLabel(tree)).toBe(NO_PERMIT);

    act(() => tree.unmount());
  });

  it('writes the tapped permit to the shared store', () => {
    const tree = render(<ParkingPermitOptions />);

    const east = rowsOf(tree).find((row) => row.props.label === 'East Commuter')!;
    act(() => east.props.onPress());

    expect(parkingPermitStore.get()).toBe('East Commuter');
    expect(selectedLabel(tree)).toBe('East Commuter');

    act(() => tree.unmount());
  });

  it('keeps the Parking tab sheet and the Settings screen in sync through the store', () => {
    // Two mounted copies stand in for the sheet and the settings screen being open in turn.
    const sheet = render(<ParkingPermitSheet visible onClose={jest.fn()} />);
    const settings = render(<ParkingPermitOptions />);

    const upgrade = rowsOf(sheet).find((row) => row.props.label === 'Upgrade')!;
    act(() => upgrade.props.onPress());

    expect(selectedLabel(sheet)).toBe('Upgrade');
    expect(selectedLabel(settings)).toBe('Upgrade');

    act(() => sheet.unmount());
    act(() => settings.unmount());
  });
});

describe('ParkingPermitSheet', () => {
  it('renders nothing until it is opened', () => {
    const closed = render(<ParkingPermitSheet visible={false} onClose={jest.fn()} />);
    expect(closed.toJSON()).toBeNull();
    act(() => closed.unmount());

    const open = render(<ParkingPermitSheet visible onClose={jest.fn()} />);
    expect(rowsOf(open).length).toBe(PARKING_PERMIT_CHOICES.length);
    act(() => open.unmount());
  });

  it('closes from the backdrop and the ✕ button', () => {
    const onClose = jest.fn();
    const tree = render(<ParkingPermitSheet visible onClose={onClose} />);

    const closers = tree.root.findAll(
      (node) =>
        typeof node.type === 'string' &&
        (node.props.accessibilityLabel === 'Close modal' ||
          node.props.accessibilityLabel === 'Close')
    );
    expect(closers.length).toBeGreaterThanOrEqual(2);
    act(() => closers.forEach((node) => node.props.onClick?.() ?? node.props.onPress?.()));

    expect(onClose).toHaveBeenCalled();
    act(() => tree.unmount());
  });
});
