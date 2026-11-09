import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Wordmark } from '@/components/wordmark';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useProfile } from '@/features/profile/profile-context';
import { homeFor } from '@/features/profile/types';
import * as auth from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

type Mode = 'signin' | 'signup';

const MIN_PASSWORD = 8;

export default function SignInScreen() {
  const { refresh } = useProfile();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  function localError(): string | null {
    if (auth.isLocalMode) return null; // no backend: any input continues
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email.';
    if (mode === 'signup' && password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
    if (mode === 'signup' && password !== confirm) return "Passwords don't match.";
    if (!password) return 'Enter your password.';
    return null;
  }

  async function handleContinue() {
    setNotice(null);
    const invalid = localError();
    setError(invalid);
    if (invalid) return;

    setBusy(true);
    try {
      const result = mode === 'signin' ? await auth.signIn(email, password) : await auth.signUp(email, password);
      if (!result.ok) return setError(result.error);
      if (result.needsConfirmation) {
        // Not switchMode(): that clears the notice in the same render batch.
        setMode('signin');
        setNotice('Check your email to confirm your account, then sign in.');
        return;
      }
      const profile = await refresh();
      router.replace(profile ? homeFor(profile) : '/onboarding/role');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Wordmark */}
          <View style={styles.hero}>
            <Wordmark size={44} />
            <Text style={styles.tagline}>One tap. Right help. Your language.</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.toggle} accessibilityRole="tablist">
            {(['signin', 'signup'] as const).map(m => (
              <Pressable
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => switchMode(m)}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}>
                <Text style={[styles.toggleLabel, mode === m && styles.toggleLabelActive]}>
                  {m === 'signin' ? 'Sign in' : 'Sign up'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                returnKeyType={mode === 'signin' ? 'go' : 'next'}
                onSubmitEditing={mode === 'signin' ? handleContinue : undefined}
                accessibilityLabel="Password"
              />
            </View>

            {mode === 'signup' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textFaint}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="go"
                  onSubmitEditing={handleContinue}
                  accessibilityLabel="Confirm password"
                />
              </View>
            )}

            {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
            {notice && <Text style={styles.notice} accessibilityLiveRegion="polite">{notice}</Text>}

            <Button
              label={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={handleContinue}
              loading={busy}
              style={styles.cta}
            />

            {mode === 'signin' && (
              <Pressable style={styles.forgotBtn}>
                <Text style={styles.forgotLabel}>Forgot password?</Text>
              </Pressable>
            )}

            {auth.isLocalMode && (
              <Text style={styles.localNote}>Dev mode: no Supabase keys set, so sign-in is skipped and data stays on this device.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // Hero
  hero: { alignItems: 'center', marginBottom: 40, gap: Spacing.sm },
  tagline: { ...Type.body, color: Colors.textMuted, textAlign: 'center' },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginBottom: 28,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  toggleLabel: { ...Type.body, fontWeight: '500', color: Colors.textMuted },
  toggleLabelActive: { color: Colors.text, fontWeight: '700' },

  // Form
  form: { gap: Spacing.lg },
  field: { gap: 6 },
  fieldLabel: Type.label,
  input: {
    ...Type.body,
    fontSize: 16,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  error: { ...Type.caption, color: Colors.danger },
  notice: { ...Type.caption, color: Colors.success },
  cta: { marginTop: Spacing.sm },
  forgotBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  forgotLabel: { ...Type.label, fontWeight: '500', color: Colors.textMuted },
  localNote: { ...Type.caption, textAlign: 'center' },
});
