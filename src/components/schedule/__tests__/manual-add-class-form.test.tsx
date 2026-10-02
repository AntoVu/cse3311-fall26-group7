import renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ManualAddClassForm } from '@/components/schedule/manual-add-class-form';
import { AddClassSheet } from '@/components/schedule/add-class-sheet';
import { OptionRow } from '@/components/ui/option-row';
import { ScheduleProvider } from '@/context/schedule-context';
import { classBuildingOptions } from '@/data/buildings';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

describe('ManualAddClassForm', () => {
  it('renders the typed fields and the submit button', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ScheduleProvider initialClasses={[]} initialTime={new Date()}>
            <ManualAddClassForm />
          </ScheduleProvider>
        </SafeAreaProvider>
      );
    });

    // Three typed fields: class name, class code and room. Building is a picker now, and the
    // two times are pickers, so none of those is a TextInput here.
    const placeholders = tree!.root.findAllByType(TextInput).map((input) => input.props.placeholder);
    expect(placeholders).toEqual(
      expect.arrayContaining(['Operating Systems', 'CSE 3320', '129'])
    );
    expect(placeholders).not.toContain('ERB');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders cancel button when showCancelButton is true and onCancel is provided', () => {
    const onCancel = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ScheduleProvider initialClasses={[]} initialTime={new Date()}>
            <ManualAddClassForm showCancelButton onCancel={onCancel} />
          </ScheduleProvider>
        </SafeAreaProvider>
      );
    });

    const cancelButton = tree!.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Cancel' &&
        typeof node.props.onPress === 'function'
    );
    expect(cancelButton).toBeDefined();

    act(() => {
      cancelButton.props.onPress();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);

    act(() => {
      tree!.unmount();
    });
  });
});

describe('AddClassSheet', () => {
  it('renders nothing when visible is false', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ScheduleProvider initialClasses={[]} initialTime={new Date()}>
            <AddClassSheet visible={false} onClose={jest.fn()} />
          </ScheduleProvider>
        </SafeAreaProvider>
      );
    });

    // The sheet is closed: none of its chrome or its form is mounted.
    expect(tree!.root.findAllByProps({ accessibilityLabel: 'Close modal' })).toHaveLength(0);
    expect(tree!.root.findAllByType(ManualAddClassForm)).toHaveLength(0);

    act(() => {
      tree!.unmount();
    });
  });

  it('renders sheet when visible is true and handles close', () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ScheduleProvider initialClasses={[]} initialTime={new Date()}>
            <AddClassSheet visible={true} onClose={onClose} />
          </ScheduleProvider>
        </SafeAreaProvider>
      );
    });

    const closeButton = tree!.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Close' &&
        typeof node.props.onPress === 'function'
    );
    expect(closeButton).toBeDefined();

    act(() => {
      closeButton.props.onPress();
    });
    expect(onClose).toHaveBeenCalled();

    act(() => {
      tree!.unmount();
    });
  });
});

describe('BuildingPickerField inside the form', () => {
  function renderForm() {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ScheduleProvider initialClasses={[]} initialTime={new Date()}>
            <ManualAddClassForm />
          </ScheduleProvider>
        </SafeAreaProvider>
      );
    });
    return tree!;
  }

  const buildingButton = (tree: renderer.ReactTestRenderer) =>
    tree.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel === 'Building' &&
        typeof node.props.onPress === 'function'
    );

  const optionLabels = (tree: renderer.ReactTestRenderer) =>
    tree.root.findAllByType(OptionRow).map((row) => row.props.label);

  it('starts closed, asking to be filled in', () => {
    const tree = renderForm();
    expect(optionLabels(tree)).toHaveLength(0);
    expect(buildingButton(tree).props.accessibilityState).toEqual({ expanded: false });
    act(() => tree.unmount());
  });

  it('offers real campus buildings once opened', () => {
    const tree = renderForm();
    act(() => buildingButton(tree).props.onPress());
    expect(optionLabels(tree).length).toBeGreaterThan(0);
    for (const label of optionLabels(tree)) {
      expect(classBuildingOptions().map((option) => option.name)).toContain(label);
    }
    act(() => tree.unmount());
  });

  it('narrows the list as you type', () => {
    const tree = renderForm();
    act(() => buildingButton(tree).props.onPress());

    const search = tree.root
      .findAllByType(TextInput)
      .find((input) => input.props.accessibilityLabel === 'Search buildings')!;
    act(() => search.props.onChangeText('nedderman'));

    expect(optionLabels(tree)).toEqual(['Nedderman Hall']);
    act(() => tree.unmount());
  });

  it('says so when nothing matches, instead of silently accepting it', () => {
    const tree = renderForm();
    act(() => buildingButton(tree).props.onPress());
    const search = tree.root
      .findAllByType(TextInput)
      .find((input) => input.props.accessibilityLabel === 'Search buildings')!;
    act(() => search.props.onChangeText('hogwarts'));

    expect(optionLabels(tree)).toHaveLength(0);
    act(() => tree.unmount());
  });

  it('closes and shows the choice once a building is picked', () => {
    const tree = renderForm();
    act(() => buildingButton(tree).props.onPress());
    // The unsearched list is capped, so search the way a user would before picking.
    const search = tree.root
      .findAllByType(TextInput)
      .find((input) => input.props.accessibilityLabel === 'Search buildings')!;
    act(() => search.props.onChangeText('nedderman'));

    const nedderman = tree.root
      .findAllByType(OptionRow)
      .find((row) => row.props.label === 'Nedderman Hall')!;
    act(() => nedderman.props.onPress());

    expect(optionLabels(tree)).toHaveLength(0);
    expect(buildingButton(tree).props.accessibilityState).toEqual({ expanded: false });
    act(() => tree.unmount());
  });
});
