import { describe, expect, it } from '@jest/globals';

import { friendlyError, OFFLINE } from '@/lib/errors';

import { formatDate, formatNumber, formatTime } from '../format';
import i18n from '../index';
import { accountLanguageStep, isRtl, isUiLanguage, pickUiLanguage, resolveUiLanguage, setupAppLanguage, UNTRANSLATED } from '../languages';

describe('picking the UI language', () => {
  it('prefers the profile, then the welcome pick, then the device', () => {
    expect(pickUiLanguage({ profile: 'ko', pending: 'es', device: 'fr-FR' })).toBe('ko');
    expect(pickUiLanguage({ profile: null, pending: 'es', device: 'fr-FR' })).toBe('es');
    expect(pickUiLanguage({ device: 'fr-FR' })).toBe('fr');
    expect(pickUiLanguage({})).toBe('en');
  });

  it('maps region tags and untranslated languages', () => {
    expect(resolveUiLanguage('pt-BR')).toBe('pt');
    expect(resolveUiLanguage('zh_Hans_CN')).toBe('zh');
    expect(resolveUiLanguage('fil')).toBe('tl');
    expect(resolveUiLanguage('de')).toBe('en'); // listed in LANGUAGES, not translated yet
    expect(resolveUiLanguage('ase')).toBe('en');
  });

  it('keeps the welcome pill and the account on one language', () => {
    // Picked on welcome since signing out: the account takes it on.
    expect(accountLanguageStep('en', { language: 'es', picked: true })).toEqual({ save: 'es' });
    expect(accountLanguageStep('es', { language: 'es', picked: true })).toEqual({ forgetPick: true });
    expect(accountLanguageStep('en', { language: 'de', picked: true })).toEqual({ forgetPick: true }); // untranslated pick from an older build
    // No pick: the device remembers the account's language for the welcome page.
    expect(accountLanguageStep('ko', { language: 'es', picked: false })).toEqual({ remember: 'ko' });
    expect(accountLanguageStep('ko', { language: undefined, picked: false })).toEqual({ remember: 'ko' });
    expect(accountLanguageStep('ko', { language: 'ko', picked: false })).toBeNull();
    // Picked the account's own language while an unsaved pick showed (venue pill back to 한국어): just drop the pick.
    expect(accountLanguageStep('ko', { language: 'ko', picked: true })).toEqual({ forgetPick: true });
  });

  it('remembers the language an untranslated account is shown in, so sign-out/in agree', () => {
    // Account Hindi is shown in English: the welcome page shows English too, not the old pick.
    expect(accountLanguageStep('hi', { language: 'ar', picked: false })).toEqual({ remember: 'en' });
    expect(accountLanguageStep('hi', { language: 'en', picked: false })).toBeNull();
  });

  it('starts a new profile in the welcome pick, else a translated primary, else what is on screen', () => {
    expect(setupAppLanguage('hi', 'ar', 'ar')).toBe('ar'); // untranslated primary keeps the pick
    expect(setupAppLanguage('ko', 'ar', 'ar')).toBe('ar'); // a pick wins over a translated primary too
    expect(setupAppLanguage('ko', null, 'es')).toBe('ko');
    expect(setupAppLanguage('hi', null, 'es')).toBe('es');
    expect(setupAppLanguage('hi', 'de', 'en')).toBe('en'); // untranslated pick from an older build
  });

  it('lists every untranslated language for the pills to leave out', () => {
    expect(UNTRANSLATED).toEqual(expect.arrayContaining(['de', 'it', 'hi', 'th', 'he', 'ase']));
    expect(UNTRANSLATED).not.toEqual(expect.arrayContaining(['en']));
    expect(UNTRANSLATED.some(isUiLanguage)).toBe(false);
  });

  it('knows which languages are right-to-left', () => {
    expect(['ar', 'fa', 'ar-EG'].map(isRtl)).toEqual([true, true, true]);
    expect(['en', 'ja', 'hy'].map(isRtl)).toEqual([false, false, false]);
  });
});

describe('switching language', () => {
  it('translates t() calls and friendly errors live', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('tabs.venue')).toBe('Sede');
    expect(friendlyError(new TypeError('Failed to fetch'))).toBe('No se puede conectar con VenU. Revisa tu conexión e inténtalo de nuevo.');
    expect(friendlyError({ message: 'The object exceeded the maximum allowed size' })).toBe('Esa foto pesa más de 5 MB. Elige una más pequeña.');
    expect(friendlyError(undefined)).toBe('Algo salió mal. Inténtalo de nuevo.');
    await i18n.changeLanguage('ru');
    expect(i18n.t('count.people', { count: 3 })).toBe('3 человека');
    expect(i18n.t('count.people', { count: 5 })).toBe('5 человек');
    await i18n.changeLanguage('en');
    expect(i18n.t('count.people', { count: 1 })).toBe('1 person');
    expect(friendlyError(new TypeError('Failed to fetch'))).toBe("Can't reach VenU. Check your connection and try again.");
  });

  it('keeps OFFLINE equal to the offline message in the current language', async () => {
    // A named import is a live binding, as in app/index.tsx's `loadError === OFFLINE`.
    await i18n.changeLanguage('ko');
    expect(OFFLINE).toBe(friendlyError(new TypeError('Failed to fetch')));
    expect(OFFLINE).toMatch(/^VenU에/);
    await i18n.changeLanguage('en');
    expect(OFFLINE).toBe("Can't reach VenU. Check your connection and try again.");
  });
});

describe('formatting', () => {
  const day = new Date(2026, 9, 24, 14, 5);

  it('formats dates in the language, always on the Gregorian calendar', () => {
    expect(formatDate(day, 'short', 'en')).toBe('10/24/2026');
    expect(formatDate(day, 'short', 'es')).toBe('24/10/2026');
    expect(formatDate(day, 'short', 'fa')).toBe('۲۰۲۶/۱۰/۲۴'); // Persian digits, Gregorian year
    expect(formatDate(day, 'medium', 'en')).toBe('Oct 24, 2026');
  });

  it('formats times and numbers', () => {
    expect(formatTime(day, 'en')).toMatch(/^2:05\sPM$/);
    expect(formatTime(day, 'fr')).toBe('14:05');
    expect(formatNumber(1234.5, undefined, 'en')).toBe('1,234.5');
    expect(formatNumber(1234.5, undefined, 'fr')).toMatch(/^1\s234,5$/);
  });

  it('uses the current language by default', async () => {
    await i18n.changeLanguage('es');
    expect(formatDate(day)).toBe('24/10/2026');
    await i18n.changeLanguage('en');
  });
});
