// Work that has to run while the user is still signed in, just before signing out. Example: closing
// an open help request, which the server only accepts from the request's owner, so after sign-out
// it would be refused and volunteers would keep seeing the request.
// Sign-out waits at most `timeoutMs` for these, so it still works offline.

type Task = () => Promise<void>;

const tasks = new Set<Task>();

/** Runs `task` before every sign-out. Returns a function that removes it. */
export function onBeforeSignOut(task: Task): () => void {
  tasks.add(task);
  return () => {
    tasks.delete(task);
  };
}

/** Runs every task at once and waits until they all settle or `timeoutMs` passes, whichever is first. Never throws. */
export async function runBeforeSignOut(timeoutMs = 3000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>(resolve => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const all = Promise.allSettled([...tasks].map(task => Promise.resolve().then(task)));
  await Promise.race([all, timeout]);
  clearTimeout(timer);
}
