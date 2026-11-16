import { afterEach, describe, expect, it } from '@jest/globals';

import { validateAuth } from '@/features/auth/validate';
import i18n from '@/i18n';

import { ACCESS_NEEDS, AGE_BANDS, COMMUNICATION, GENDERS, HELPER_AGE, HELPER_GENDER, labeled, labelFor, TRAININGS } from '../options';
import { helperSummary } from '../summary';
import { emptyDraft } from '../types';
import { validateDraft } from '../validate';

const ALL = { ACCESS_NEEDS, AGE_BANDS, COMMUNICATION, GENDERS, HELPER_AGE, HELPER_GENDER, TRAININGS };
const tFor = (lng: string) => i18n.getFixedT(lng, 'profile');

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('option labels', () => {
  it('has an English label for every stored value (no raw keys)', () => {
    for (const [group, options] of Object.entries(ALL)) {
      for (const o of labeled(options, tFor('en'))) expect({ group, value: o.value, label: o.label }).toEqual({ group, value: o.value, label: expect.not.stringMatching(/options\./) });
    }
    expect(labelFor(ACCESS_NEEDS, 'wheelchair', tFor('en'))).toBe('Wheelchair user');
  });

  it("follows the passed t's language and keeps the stored value", () => {
    expect(labelFor(ACCESS_NEEDS, 'wheelchair', tFor('es'))).toBe('Uso silla de ruedas');
    expect(labeled(HELPER_GENDER, tFor('es')).map(o => o.value)).toEqual(['none', 'man', 'woman']);
    expect(labelFor(GENDERS, 'prefer_not', tFor('ja'))).toBe('回答しない');
  });

  it('uses the t it is given, not the global language (so a memoized screen re-renders with the new t)', async () => {
    await i18n.changeLanguage('ko');
    expect(labelFor(ACCESS_NEEDS, 'wheelchair', tFor('es'))).toBe('Uso silla de ruedas');
  });
});

describe('translated summary and validation', () => {
  const rosa = { ...emptyDraft('visitor', 'es'), firstName: 'Rosa', languages: ['es', 'en'], accessNeeds: ['wheelchair' as const], communication: ['text' as const], privacyAccepted: true };

  it("builds the helper tags in the passed t's language", async () => {
    expect(helperSummary(rosa, tFor('es'))).toEqual(['Habla español, inglés', 'Uso silla de ruedas', 'Prefiere texto / escrito']);
    expect(helperSummary(rosa, tFor('zh'))[0]).toBe('会说西班牙语、英语');
    await i18n.changeLanguage('ar'); // the global language doesn't leak in
    expect(helperSummary(rosa, tFor('es'))[0]).toBe('Habla español, inglés');
  });

  it('writes form errors in the UI language', async () => {
    await i18n.changeLanguage('ar');
    expect(validateDraft({ ...rosa, firstName: '' }).firstName).toBe('أضف اسمك الأول.');
    expect(validateAuth('signup', { email: 'rosa@example.com', username: 'rosa', password: 'short', termsAccepted: true }, false)?.message).toBe('استخدم 8 أحرف على الأقل لكلمة المرور.');
  });
});
