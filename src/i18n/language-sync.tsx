// Keeps i18next on the right language; mounted once in app/_layout.tsx, renders nothing.
// Priority: signed-in profile's appLanguage → this device's language (pending setup) → device OS → English.
// The welcome pill and the account stay in step: a welcome pick is saved to the account at sign-in,
// and the account's language stays on the welcome page after sign-out.
// e.g. picked 한국어 on welcome, signs in as Rosa (appLanguage 'es') → Korean, saved to Rosa's profile.

import { useLocales } from 'expo-localization';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { PRIVACY_VERSION } from '@/features/profile/privacy';
import { useProfile } from '@/features/profile/profile-context';
import { draftFromProfile } from '@/features/profile/types';

import { applyDirection } from './direction';
import i18n from './index';
import { accountLanguageStep, pickUiLanguage } from './languages';
import { forgetLanguagePick, refreshPendingLanguage, rememberAccountLanguage, usePendingLanguage } from './pending-language';

export function LanguageSync() {
  const { status, profile, save } = useProfile();
  const pending = usePendingLanguage();
  const device = useLocales()[0]?.languageCode; // re-renders when the OS language changes
  const pathname = usePathname();

  // The welcome pill writes pending setup straight to storage, so re-read it on each route change
  // and on returning to the app.
  useEffect(() => {
    refreshPendingLanguage();
  }, [pathname]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => s === 'active' && refreshPendingLanguage());
    return () => sub.remove();
  }, []);

  // Keep the welcome pill and the account on one language (see accountLanguageStep).
  const saving = useRef(false);
  useEffect(() => {
    if (status !== 'ready' || !profile || !pending.loaded || saving.current) return;
    const step = accountLanguageStep(profile.appLanguage, pending);
    if (!step) return;
    if ('remember' in step) return void rememberAccountLanguage(step.remember);
    // Saving re-stamps privacy consent, so an account that hasn't agreed to the current policy keeps its language.
    if ('forgetPick' in step || profile.privacyVersion !== PRIVACY_VERSION) return void forgetLanguagePick();
    saving.current = true;
    save({ ...draftFromProfile(profile), appLanguage: step.save }, null)
      .then(() => forgetLanguagePick())
      .catch(() => {}) // offline: the pick stays on screen and is saved on the next try
      .finally(() => { saving.current = false; });
  }, [status, profile, pending, save]);

  // Wait for the profile and stored pick, so a device language never flashes in (or asks for an RTL restart) first.
  const settled = status !== 'loading' && pending.loaded;
  const language = pickUiLanguage({
    // A fresh welcome pick wins while it's being saved to the account, so the old language doesn't flash in.
    profile: status === 'ready' && !pending.picked ? profile?.appLanguage : null,
    pending: pending.language,
    device,
  });

  useEffect(() => {
    if (!settled) return;
    if (i18n.language !== language) i18n.changeLanguage(language);
    applyDirection(language);
  }, [settled, language]);

  return null;
}
