import { describe, expect, it } from '@jest/globals';

import { validateAuth } from '../validate';

const ok = { email: 'rosa@example.com', username: 'rosa_m', password: 'longenough', termsAccepted: true };

describe('validateAuth', () => {
  it('accepts a complete sign-up and sign-in', () => {
    expect(validateAuth('signup', ok, false)).toBeNull();
    expect(validateAuth('signin', { email: ok.email, password: 'x' }, false)).toBeNull();
  });

  it('points each problem at its field', () => {
    expect(validateAuth('signin', { ...ok, email: 'rosa@' }, false)?.field).toBe('email');
    expect(validateAuth('signin', { ...ok, password: '' }, false)?.field).toBe('password');
    expect(validateAuth('signup', { ...ok, password: 'short' }, false)).toEqual({
      field: 'password',
      message: 'Use at least 8 characters for your password.',
    });
  });

  it('requires the terms box on sign-up only', () => {
    expect(validateAuth('signup', { ...ok, termsAccepted: false }, false)?.field).toBe('terms');
    expect(validateAuth('signin', { ...ok, termsAccepted: false }, false)).toBeNull();
  });

  it('lets any email and password through in local mode, but still asks for a username and the terms', () => {
    expect(validateAuth('signin', { email: '', password: '' }, true)).toBeNull();
    expect(validateAuth('signup', { email: '', username: 'rosa', password: '', termsAccepted: false }, true)?.field).toBe('terms');
    expect(validateAuth('signup', { email: '', username: 'rosa', password: '', termsAccepted: true }, true)).toBeNull();
    expect(validateAuth('signup', { email: '', username: '', password: '', termsAccepted: true }, true)?.field).toBe('username');
  });
});

describe('usernames on Create Account', () => {
  it('needs one that follows the rules, in any case', () => {
    expect(validateAuth('signup', { ...ok, username: 'Rosa_M' }, false)).toBeNull();
    expect(validateAuth('signup', { ...ok, username: 'ro' }, false)).toEqual({
      field: 'username',
      message: 'Use 3–20 characters for your username.',
    });
    expect(validateAuth('signup', { ...ok, username: 'rosa m' }, false)).toEqual({
      field: 'username',
      message: 'Use only letters, numbers, _ and . in your username.',
    });
  });

  it('still needs a real email next to it', () => {
    expect(validateAuth('signup', { ...ok, email: 'rosa_m' }, false)?.field).toBe('email');
  });
});

describe('Sign In with a username or an email', () => {
  it('takes a username where the email goes', () => {
    expect(validateAuth('signin', { email: 'rosa_m', password: 'x' }, false)).toBeNull();
    expect(validateAuth('signin', { email: '  Rosa_M ', password: 'x' }, false)).toBeNull();
  });

  it('asks for one when the field is empty', () => {
    expect(validateAuth('signin', { email: ' ', password: 'x' }, false)).toEqual({
      field: 'email',
      message: 'Enter your username or email.',
    });
  });

  it('explains a username that could never exist instead of trying to sign in', () => {
    expect(validateAuth('signin', { email: 'rosa m', password: 'x' }, false)?.message).toBe('Use only letters, numbers, _ and . in your username.');
  });

  it('checks the email format only when it looks like an email', () => {
    expect(validateAuth('signin', { email: 'rosa@example', password: 'x' }, false)?.message).toBe('Enter a valid email.');
  });
});
