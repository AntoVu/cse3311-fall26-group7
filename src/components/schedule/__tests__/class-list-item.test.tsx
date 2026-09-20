import renderer, { act } from 'react-test-renderer';

import { ClassListItem } from '@/components/schedule/class-list-item';
import { ThemedText } from '@/components/themed-text';
import { CLASS_FLAG_COLORS, getClassFlagColor } from '@/constants/schedule';
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

    expect(joinedText).toContain('Done');
    expect(joinedText).not.toContain('Upcoming class');
    expect(joinedText).not.toContain('In progress');

    act(() => {
      tree!.unmount();
    });
  });
});
