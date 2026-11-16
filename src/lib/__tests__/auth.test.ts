import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// A stand-in Supabase client: usernames → emails, and which calls the app made.
const mockAccounts: Record<string, string> = { rosa_m: 'rosa@example.com' };
const mockRpc = jest.fn(async (fn: string, args: { p_username: string }) => {
  if (fn === 'email_for_username') return { data: mockAccounts[args.p_username] ?? null, error: null };
  if (fn === 'username_available') return { data: !(args.p_username in mockAccounts), error: null };
  return { data: null, error: { message: `unknown function ${fn}` } };
});
const mockSignInWithPassword = jest.fn(async (_: { email: string; password: string }) => ({ data: {}, error: null }));
const mockSignUp = jest.fn(async (_: unknown) => ({ data: { session: { access_token: 't' } }, error: null }));

// Wrapped so the mocks are read at call time: the import below is hoisted above the consts.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (fn: string, args: { p_username: string }) => mockRpc(fn, args),
    auth: {
      signInWithPassword: (creds: { email: string; password: string }) => mockSignInWithPassword(creds),
      signUp: (body: unknown) => mockSignUp(body),
    },
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// eslint-disable-next-line import/first
import { signIn, signUp as createAccount } from '../auth';

beforeEach(() => {
  mockRpc.mockClear();
  mockSignInWithPassword.mockClear();
  mockSignUp.mockClear();
});

describe('signIn', () => {
  it('looks a username up, then signs in with its email', async () => {
    expect(await signIn('  Rosa_M ', 'pw')).toEqual({ ok: true, email: 'rosa@example.com' });
    expect(mockRpc).toHaveBeenCalledWith('email_for_username', { p_username: 'rosa_m' });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'rosa@example.com', password: 'pw' });
  });

  it('signs in with an email directly', async () => {
    expect(await signIn(' rosa@example.com ', 'pw')).toEqual({ ok: true, email: 'rosa@example.com' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('words an unknown username like a wrong password, without trying to sign in', async () => {
    expect(await signIn('nobody', 'pw')).toEqual({ ok: false, error: 'Wrong username or password.' });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

describe('signUp', () => {
  it('sends the username (lower case) as user metadata', async () => {
    expect(await createAccount('daniel@example.com', 'longenough', 'Daniel_K')).toMatchObject({ ok: true, needsConfirmation: false });
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'daniel@example.com', password: 'longenough', options: { data: { username: 'daniel_k' } } });
  });

  it('stops on a taken username and points at the field', async () => {
    expect(await createAccount('other@example.com', 'longenough', 'rosa_m')).toEqual({
      ok: false,
      error: 'That username is taken. Try another.',
      field: 'username',
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
