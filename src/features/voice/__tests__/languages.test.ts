import { describe, expect, it } from '@jest/globals';

import { TRANSLATED } from '@/i18n/languages';

import { matchLocale, pickSpeechLanguage, speechLocale, startPlans } from '../languages';

describe('speech locales', () => {
  it('maps every translated UI language to a BCP-47 locale', () => {
    expect(Object.fromEntries(TRANSLATED.map(code => [code, speechLocale(code)]))).toEqual({
      en: 'en-US', es: 'es-US', zh: 'zh-CN', ko: 'ko-KR', tl: 'fil-PH', vi: 'vi-VN', hy: 'hy-AM',
      fa: 'fa-IR', ja: 'ja-JP', ru: 'ru-RU', ar: 'ar-SA', fr: 'fr-FR', pt: 'pt-BR',
    });
  });

  it('takes region tags and has nothing for sign language or unknown codes', () => {
    expect(speechLocale('pt-PT')).toBe('pt-BR');
    expect(speechLocale('zh_Hans')).toBe('zh-CN');
    expect(speechLocale('ase')).toBeNull();
    expect(speechLocale('xx')).toBeNull();
    expect(speechLocale(null)).toBeNull();
  });

  it("follows the profile's main language, else the UI language, else English", () => {
    expect(pickSpeechLanguage({ profile: 'ko', ui: 'es' })).toEqual({ code: 'ko', locale: 'ko-KR' });
    expect(pickSpeechLanguage({ profile: null, ui: 'tl' })).toEqual({ code: 'tl', locale: 'fil-PH' });
    expect(pickSpeechLanguage({ profile: 'ase', ui: 'fa' })).toEqual({ code: 'fa', locale: 'fa-IR' });
    expect(pickSpeechLanguage({ profile: 'de', ui: 'en' })).toEqual({ code: 'de', locale: 'de-DE' });
    expect(pickSpeechLanguage({})).toEqual({ code: 'en', locale: 'en-US' });
  });

  it('matches device locales exactly first, then by language', () => {
    expect(matchLocale('zh-CN', ['zh-TW', 'zh-CN'])).toBe('zh-CN');
    expect(matchLocale('es-US', ['es-MX', 'en-US'])).toBe('es-MX');
    expect(matchLocale('ko-KR', ['ko_KR'])).toBe('ko_KR');
    expect(matchLocale('hy-AM', ['en-US'])).toBeNull();
  });
});

describe('start plans', () => {
  it('tries on-device first where the model is installed, then the default, then English', () => {
    expect(startPlans('es-US', { locales: ['es-US', 'en-US'], installed: ['es-US', 'en-US'] })).toEqual([
      { lang: 'es-US', onDevice: true, fellBack: false },
      { lang: 'es-US', onDevice: false, fellBack: false },
      { lang: 'en-US', onDevice: true, fellBack: true },
      { lang: 'en-US', onDevice: false, fellBack: true },
    ]);
  });

  it('skips straight to English when the device says the language is unsupported', () => {
    expect(startPlans('hy-AM', { locales: ['en-US', 'fr-FR'], installed: [] })).toEqual([
      { lang: 'en-US', onDevice: false, fellBack: true },
    ]);
  });

  it("tries the language as asked when the device didn't list anything (web, older Android)", () => {
    expect(startPlans('fa-IR', { locales: [], installed: [] })).toEqual([
      { lang: 'fa-IR', onDevice: false, fellBack: false },
      { lang: 'en-US', onDevice: false, fellBack: true },
    ]);
    expect(startPlans('en-US', { locales: [], installed: [] })).toEqual([{ lang: 'en-US', onDevice: false, fellBack: false }]);
  });
});
