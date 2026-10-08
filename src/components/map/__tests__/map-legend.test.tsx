import { act } from 'react';
import { Text } from 'react-native';
import renderer from 'react-test-renderer';

import { LegendBox, LegendRow } from '@/components/map/map-legend';

function render(element: React.ReactElement) {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(element);
  });
  return tree!;
}

function textsOf(tree: renderer.ReactTestRenderer) {
  return tree.root.findAllByType(Text).map((node) => [node.props.children].flat().join(''));
}

function press(tree: renderer.ReactTestRenderer) {
  tree.root.findAll((node) => node.props.accessibilityRole === 'button' && !!node.props.onPress)[0].props.onPress();
}

const legend = (variant?: 'bar' | 'chip' | 'plain') => (
  <LegendBox variant={variant}>
    <LegendRow color="#00ff00" label="Allowed" />
    <LegendRow color="#ff0000" label="Not allowed" />
  </LegendBox>
);

describe('LegendBox', () => {
  it('shows every row as a bar by default', () => {
    const tree = render(legend());
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['Allowed', 'Not allowed']));
    act(() => tree.unmount());
  });

  it('starts as a collapsed chip and opens on tap', () => {
    const tree = render(legend('chip'));
    expect(textsOf(tree)).toContain('Legend');
    expect(textsOf(tree)).not.toContain('Allowed');

    act(() => press(tree));
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['Allowed', 'Not allowed']));

    act(() => press(tree));
    expect(textsOf(tree)).not.toContain('Allowed');
    act(() => tree.unmount());
  });
});
