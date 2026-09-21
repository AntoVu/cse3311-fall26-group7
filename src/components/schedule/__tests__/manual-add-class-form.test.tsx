import renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ManualAddClassForm } from '@/components/schedule/manual-add-class-form';
import { AddClassSheet } from '@/components/schedule/add-class-sheet';
import { ScheduleProvider } from '@/context/schedule-context';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

describe('ManualAddClassForm', () => {
  it('renders all required input fields and the submit button', () => {
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

    const inputs = tree!.root.findAllByType(TextInput);
    expect(inputs.length).toBe(4);

    const placeholders = inputs.map((input) => input.props.placeholder);
    expect(placeholders).toContain('Operating Systems');
    expect(placeholders).toContain('CSE 3320');
    expect(placeholders).toContain('ERB');
    expect(placeholders).toContain('129');

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
