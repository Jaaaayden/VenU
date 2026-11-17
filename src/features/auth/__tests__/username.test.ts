import { describe, expect, it } from '@jest/globals';

import { isEmailLike, normalizeUsername, usernameProblem } from '../username';

describe('usernames', () => {
  it('compares in lower case without surrounding spaces', () => {
    expect(normalizeUsername('  Rosa_M ')).toBe('rosa_m');
  });

  it('allows 3-20 of a-z 0-9 _ .', () => {
    expect(usernameProblem('rosa_m.28')).toBeNull();
    expect(usernameProblem('abc')).toBeNull();
    expect(usernameProblem('a'.repeat(20))).toBeNull();
  });

  it('says what is wrong with one that breaks the rules', () => {
    expect(usernameProblem('ro')).toBe('length');
    expect(usernameProblem('a'.repeat(21))).toBe('length');
    expect(usernameProblem('rosa m')).toBe('chars');
    expect(usernameProblem('rosa!')).toBe('chars');
    expect(usernameProblem('rosá')).toBe('chars'); // the DB check is ASCII-only
  });

  it('treats anything with "@" as an email on Sign In', () => {
    expect(isEmailLike('rosa@example.com')).toBe(true);
    expect(isEmailLike('rosa_m')).toBe(false);
  });
});
