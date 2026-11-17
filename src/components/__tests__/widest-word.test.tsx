// useWidestWord measures each word with a hidden probe's onLayout. React Native fires onLayout
// when a view mounts or its size changes, so a probe that stays mounted when the labels change
// never reports again. This stands in for that: only newly mounted probes get a layout event.
import { describe, expect, it } from '@jest/globals';
import { act } from 'react';
import { View } from 'react-native';
import { createRoot, type TestInstance } from 'test-renderer';

import { useWidestWord } from '../widest-word';

function Probe({ labels }: { labels: string[] }) {
  const { widest, probe } = useWidestWord(labels, null);
  return (
    <>
      {probe}
      <View testID="widest" accessibilityLabel={String(widest)} />
    </>
  );
}

const widestOf = (container: TestInstance) => container.queryAll(n => n.props.testID === 'widest')[0]?.props.accessibilityLabel;

/** Fires onLayout on probes not seen before (width = 10 per letter), like a fresh mount does. */
function layoutNew(container: TestInstance, seen: Set<TestInstance>) {
  for (const probe of container.queryAll(n => n.type === 'Text')) {
    if (seen.has(probe)) continue;
    seen.add(probe);
    const word = probe.children.join('');
    act(() => probe.props.onLayout?.({ nativeEvent: { layout: { x: 0, y: 0, width: word.length * 10, height: 20 } } }));
  }
}

describe('useWidestWord', () => {
  it('measures again when the labels change but share a word (Spanish → French: "Libre")', async () => {
    const root = createRoot();
    const seen = new Set<TestInstance>();
    // The volunteer status words, home.status.{free,busy,off}.
    await act(async () => { root.render(<Probe labels={['Libre', 'Ocupado', 'Fuera']} />); });
    layoutNew(root.container, seen);
    expect(widestOf(root.container)).toBe('70'); // Ocupado

    await act(async () => { root.render(<Probe labels={['Libre', 'Occupé', 'Absent']} />); });
    layoutNew(root.container, seen);
    expect(widestOf(root.container)).toBe('60'); // Occupé, Absent

    await act(async () => { root.unmount(); });
  });
});
