import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Type } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** primary: filled blue · secondary: outlined · danger: outlined red · link: underlined text */
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole={variant === 'link' ? 'link' : 'button'}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.onPrimary : Colors.primary} />
      ) : (
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  danger: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.dangerSoft },
  link: { minHeight: 36, paddingHorizontal: 0 },
  pressed: { opacity: 0.8 },
  inactive: { opacity: 0.5 },
  label: { ...Type.bodyStrong, fontWeight: '700' },
});

const labelStyles = StyleSheet.create({
  primary: { color: Colors.onPrimary },
  secondary: { color: Colors.text },
  danger: { color: Colors.danger },
  link: { color: Colors.primary, textDecorationLine: 'underline', fontSize: 14 },
});
