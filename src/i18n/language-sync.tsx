// Keeps i18next on the right language; mounted once in app/_layout.tsx, renders nothing.
// Priority: a pill pick not saved yet → signed-in profile's appLanguage → this device's language
// (pending setup) → device OS → English.
// The pills and the account stay in step: a pick is saved to the account (at sign-in for a welcome
// pick, at once for the venue pill), and the account's language stays on the welcome page after sign-out.
// e.g. picked 한국어 on welcome, signs in as Rosa (appLanguage 'es') → Korean, saved to Rosa's profile.

import { useLocales } from 'expo-localization';
import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useProfile } from '@/features/profile/profile-context';

import { applyDirection } from './direction';
import i18n from './index';
import { accountLanguageStep, pickFor, pickUiLanguage } from './languages';
import {
  forgetLanguagePick,
  languageSaveFailed,
  refreshPendingLanguage,
  rememberAccountLanguage,
  retryLanguageSave,
  usePendingLanguage,
} from './pending-language';

export function LanguageSync() {
  const { status, userId, profile, saveAppLanguage } = useProfile();
  const pending = usePendingLanguage();
  const device = useLocales()[0]?.languageCode; // re-renders when the OS language changes
  const pathname = usePathname();

  // Pending setup is also written straight to storage, so re-read it on each route change and on
  // returning to the app. Both also retry a pick whose save failed (e.g. offline).
  useEffect(() => {
    retryLanguageSave();
    refreshPendingLanguage();
  }, [pathname]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') return;
      retryLanguageSave();
      refreshPendingLanguage();
    });
    return () => sub.remove();
  }, []);

  // Keep the pills and the account on one language (see accountLanguageStep). Only the app language
  // is written, so privacy consent is never re-stamped by a pill.
  const saving = useRef(false);
  const [saves, setSaves] = useState(0); // bumped after each save, so a pick made meanwhile gets its turn
  useEffect(() => {
    if (status !== 'ready' || !profile || !pending.loaded || saving.current) return;
    const step = accountLanguageStep({ id: profile.id, language: profile.appLanguage }, pending);
    if (!step) return;
    if ('remember' in step) return void rememberAccountLanguage(step.remember);
    if ('forgetPick' in step) return void forgetLanguagePick();
    if (pending.saveError) return; // failed: wait for a retry (next screen, app resume, picking again)
    saving.current = true;
    const code = step.save;
    saveAppLanguage(code)
      // null: another account signed in meanwhile; keep the pick, and the next run decides for that account.
      .then(saved => (saved ? forgetLanguagePick(code) : undefined)) // a newer pick made meanwhile stays, for the next run
      .catch(e => languageSaveFailed(code, e)) // offline: the pick stays on screen; the next screen or app resume retries
      .finally(() => {
        saving.current = false;
        setSaves(n => n + 1);
      });
  }, [status, profile, pending, saveAppLanguage, saves]);

  // Wait for the profile and stored pick, so a device language never flashes in (or asks for an RTL restart) first.
  const settled = status !== 'loading' && pending.loaded;
  // A pill pick for this account wins while it's being saved, so the old language doesn't flash in.
  // Another account's unsaved pick doesn't (it's dropped as soon as the step above runs).
  const ownPick = status === 'ready' && profile ? pickFor(pending, userId) : null;
  const language = pickUiLanguage({
    profile: status === 'ready' && !ownPick ? profile?.appLanguage : null,
    pending: ownPick ?? pending.language,
    device,
  });

  useEffect(() => {
    if (!settled) return;
    if (i18n.language !== language) i18n.changeLanguage(language);
    applyDirection(language);
  }, [settled, language]);

  return null;
}
