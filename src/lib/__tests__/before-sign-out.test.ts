import { describe, expect, it, jest } from '@jest/globals';

import { onBeforeSignOut, runBeforeSignOut } from '../before-sign-out';

describe('runBeforeSignOut', () => {
  it('runs every registered task and waits for them', async () => {
    const done: string[] = [];
    const offA = onBeforeSignOut(async () => { done.push('a'); });
    const offB = onBeforeSignOut(async () => { await Promise.resolve(); done.push('b'); });
    await runBeforeSignOut();
    expect(done.sort()).toEqual(['a', 'b']);
    offA();
    offB();
  });

  it('never throws when a task fails', async () => {
    const off = onBeforeSignOut(async () => { throw new Error('offline'); });
    await expect(runBeforeSignOut()).resolves.toBeUndefined();
    off();
  });

  it('stops waiting after the timeout, so offline sign-out still goes ahead', async () => {
    jest.useFakeTimers();
    const off = onBeforeSignOut(() => new Promise<void>(() => {})); // never settles
    let finished = false;
    const run = runBeforeSignOut(3000).then(() => { finished = true; });
    await jest.advanceTimersByTimeAsync(2999);
    expect(finished).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await run;
    expect(finished).toBe(true);
    off();
    jest.useRealTimers();
  });

  it('skips a task once it is removed', async () => {
    const task = jest.fn(async () => {});
    const off = onBeforeSignOut(task);
    off();
    await runBeforeSignOut();
    expect(task).not.toHaveBeenCalled();
  });
});
