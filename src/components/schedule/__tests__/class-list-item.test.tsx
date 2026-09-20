import { StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { ClassListItem } from '@/components/schedule/class-list-item';
import { ThemedText } from '@/components/themed-text';
import {
  CLASS_FLAG_COLORS,
  CLASS_STATUS_COLORS,
  getClassFlagColor,
  withOpacity,
} from '@/constants/schedule';
import type { ScheduleClass } from '@/mocks/schedule';

describe('getClassFlagColor', () => {
  it('has a defined palette of distinct vibrant colors', () => {
    expect(CLASS_FLAG_COLORS.length).toBeGreaterThanOrEqual(8);
    const unique = new Set(CLASS_FLAG_COLORS);
    expect(unique.size).toBe(CLASS_FLAG_COLORS.length);
  });

  it('assigns colors cyclically when index is provided', () => {
    expect(getClassFlagColor('CSE 3330', 0)).toBe(CLASS_FLAG_COLORS[0]);
    expect(getClassFlagColor('CSE 3310', 1)).toBe(CLASS_FLAG_COLORS[1]);
    expect(getClassFlagColor('PHYS 1444', 2)).toBe(CLASS_FLAG_COLORS[2]);
    expect(getClassFlagColor('MATH 2425', CLASS_FLAG_COLORS.length)).toBe(CLASS_FLAG_COLORS[0]);
  });

  it('deterministically hashes class code when index is not provided', () => {
    const color1 = getClassFlagColor('CSE 3330');
    const color2 = getClassFlagColor('CSE 3330');
    expect(color1).toBe(color2);
    expect(CLASS_FLAG_COLORS).toContain(color1);
  });

  it('gives distinct colors for the mock schedule classes by code', () => {
    const cse3330 = getClassFlagColor('CSE 3330');
    const cse3310 = getClassFlagColor('CSE 3310');
    const phys1444 = getClassFlagColor('PHYS 1444');

    expect(cse3330).not.toBe(cse3310);
    expect(cse3310).not.toBe(phys1444);
    expect(cse3330).not.toBe(phys1444);
  });

  it('returns default color for empty or undefined course code', () => {
    expect(getClassFlagColor('')).toBe(CLASS_FLAG_COLORS[0]);
    expect(getClassFlagColor(undefined)).toBe(CLASS_FLAG_COLORS[0]);
  });
});

describe('ClassListItem status tags', () => {
  const baseClass: ScheduleClass = {
    id: 'cse-3310',
    courseCode: 'CSE 3310',
    courseName: 'Fundamentals of SWE',
    buildingCode: 'NH',
    roomNumber: '103',
    startTime: '2:00 PM',
    endTime: '3:20 PM',
    completed: false,
    distanceMiles: 0.4,
    walkMinutes: 8,
  };

  it('displays only "In progress" and NOT "Upcoming class" when currently in class', () => {
    const inProgressClass: ScheduleClass = {
      ...baseClass,
      status: 'upcoming',
      startsInMinutes: 0,
    };

    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<ClassListItem scheduleClass={inProgressClass} onPress={jest.fn()} />);
    });

    const texts = tree!.root.findAllByType(ThemedText).map((node) => node.props.children);
    const joinedText = JSON.stringify(texts);

    expect(joinedText).toContain('In progress');
    expect(joinedText).not.toContain('Upcoming class');

    act(() => {
      tree!.unmount();
    });
  });

  it('displays only "Upcoming class" and NOT "In progress" when class has not started yet', () => {
    const upcomingClass: ScheduleClass = {
      ...baseClass,
      status: 'upcoming',
      startsInMinutes: 47,
    };

    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<ClassListItem scheduleClass={upcomingClass} onPress={jest.fn()} />);
    });

    const texts = tree!.root.findAllByType(ThemedText).map((node) => node.props.children);
    const joinedText = JSON.stringify(texts);

    expect(joinedText).toContain('Upcoming class');
    expect(joinedText).toContain('Starts in 47 mins');
    expect(joinedText).not.toContain('In progress');

    act(() => {
      tree!.unmount();
    });
  });

  it('displays "Done" and neither upcoming nor in-progress tags when class is completed', () => {
    const doneClass: ScheduleClass = {
      ...baseClass,
      status: 'done',
      completed: true,
    };

    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<ClassListItem scheduleClass={doneClass} onPress={jest.fn()} />);
    });

    const texts = tree!.root.findAllByType(ThemedText).map((node) => node.props.children);
    const joinedText = JSON.stringify(texts);

    // Done is a green check, not text
    expect(tree!.root.findAllByProps({ testID: 'class-done-check' }).length).toBeGreaterThan(0);
    expect(joinedText).not.toContain('Done');
    expect(joinedText).not.toContain('Upcoming class');
    expect(joinedText).not.toContain('In progress');

    act(() => {
      tree!.unmount();
    });
  });

  describe('status glow', () => {
    function render(scheduleClass: ScheduleClass) {
      let tree: renderer.ReactTestRenderer | undefined;
      act(() => {
        tree = renderer.create(<ClassListItem scheduleClass={scheduleClass} onPress={jest.fn()} />);
      });
      const card = tree!.root.findAllByProps({ testID: 'class-card' })[0];
      const style = StyleSheet.flatten(card.props.style);
      const hasCheck = tree!.root.findAllByProps({ testID: 'class-done-check' }).length > 0;
      act(() => {
        tree!.unmount();
      });
      return { style, hasCheck };
    }

    it('glows faint yellow for the upcoming class', () => {
      const { style, hasCheck } = render({ ...baseClass, status: 'upcoming', startsInMinutes: 47 });
      expect(style.boxShadow).toContain(withOpacity(CLASS_STATUS_COLORS.upcoming, 0.35));
      expect(style.borderColor).toBe(withOpacity(CLASS_STATUS_COLORS.upcoming, 0.45));
      expect(hasCheck).toBe(false);
    });

    it('glows faint green for the class in progress', () => {
      const { style } = render({ ...baseClass, status: 'upcoming', startsInMinutes: 0 });
      expect(style.boxShadow).toContain(withOpacity(CLASS_STATUS_COLORS.inProgress, 0.35));
      expect(style.borderColor).toBe(withOpacity(CLASS_STATUS_COLORS.inProgress, 0.45));
    });

    it('does not glow for a normal or done class', () => {
      const normal = render({ ...baseClass, status: 'normal' });
      const done = render({ ...baseClass, status: 'done', completed: true });
      expect(normal.style.boxShadow).toBeUndefined();
      expect(normal.style.borderColor).toBe('transparent');
      expect(done.style.boxShadow).toBeUndefined();
      expect(done.hasCheck).toBe(true);
    });
  });

  it('does not render remove button when onRemove is not provided', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(<ClassListItem scheduleClass={baseClass} onPress={jest.fn()} />);
    });

    const removeButtons = tree!.root.findAll(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel?.includes('Remove')
    );
    expect(removeButtons).toHaveLength(0);

    act(() => {
      tree!.unmount();
    });
  });

  it('renders remove button when onRemove is explicitly provided', () => {
    const onRemove = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <ClassListItem scheduleClass={baseClass} onPress={jest.fn()} onRemove={onRemove} />
      );
    });

    const removeButton = tree!.root.find(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        node.props.accessibilityLabel?.includes('Remove')
    );
    expect(removeButton).toBeDefined();

    act(() => {
      tree!.unmount();
    });
  });
});
