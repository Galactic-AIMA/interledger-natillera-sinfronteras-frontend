import { Pressable, StyleSheet, View } from 'react-native';

import { palette, radius, space, touch } from '@/theme';

import { AppText } from './AppText';

type ChoiceProps<T extends string | number> = {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Selector de opciones en botones ("Mía / Doña Rosa", "2 / 4 / 6 cuotas"). */
export function Choice<T extends string | number>({ label, options, value, onChange }: ChoiceProps<T>) {
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && styles.selected]}
            >
              <AppText variant="bodyStrong" tone={selected ? 'onPrimary' : 'default'} align="center">
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  option: {
    flexGrow: 1,
    minHeight: touch.minHeight,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  selected: { backgroundColor: palette.primary },
});
