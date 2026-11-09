import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Spacing } from '@/constants/theme';
import type { Option } from '@/features/profile/options';

type SingleProps<T extends string> = {
  multiple?: false;
  value: T | null;
  onChange: (value: T) => void;
};

type MultiProps<T extends string> = {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

type ChipGroupProps<T extends string> = { options: Option<T>[]; accessibilityLabel?: string } & (SingleProps<T> | MultiProps<T>);

/** A wrapping row of chips. Single-select acts like radios, `multiple` like checkboxes. */
export function ChipGroup<T extends string>(props: ChipGroupProps<T>) {
  const { options, accessibilityLabel } = props;

  function isSelected(v: T) {
    return props.multiple ? props.value.includes(v) : props.value === v;
  }

  function toggle(v: T) {
    if (props.multiple) {
      props.onChange(props.value.includes(v) ? props.value.filter(x => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
    }
  }

  return (
    <View style={styles.row} accessibilityRole={props.multiple ? undefined : 'radiogroup'} accessibilityLabel={accessibilityLabel}>
      {options.map(o => (
        <Chip
          key={o.value}
          label={o.label}
          selected={isSelected(o.value)}
          role={props.multiple ? 'checkbox' : 'radio'}
          onPress={() => toggle(o.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
