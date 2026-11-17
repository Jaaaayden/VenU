// The volunteer's side of live matching: open requests nearby, Accept, then the chat with the visitor
// until one of them ends it. The visitor's side is request-store.ts; both talk to the same backend.
// Only live backends (supabase-backend.ts) have a volunteer side; with the mock, `live` is false and
// the volunteer home keeps its example requests.
//
// Nothing is saved on the device: after a restart, setUser asks the backend for the request this
// volunteer accepted and loads its chat again.
import { useSyncExternalStore } from 'react';

import { onBeforeSignOut } from '@/lib/before-sign-out';

import { appBackend } from './app-backend';
import { AlreadyTakenError, newId, type VolunteerBackend } from './backend';
import type { Assignment, ChatMessage, IncomingRequest, RequestClosed } from './types';

/** volunteer:desk.<key>, e.g. { key: 'cancelled', params: { name: 'Rosa' } } → "Rosa cancelled the request." */
export type DeskNoticeKey = 'taken' | 'acceptFailed' | 'cancelled' | 'done' | 'ended';

export interface DeskNotice {
  tone: 'success' | 'error';
  key: DeskNoticeKey;
  params?: { name?: string };
}

export interface DeskState {
  /** Open requests nearby, newest first (only while the list is being watched). */
  open: IncomingRequest[];
  /** The request this volunteer accepted and is helping with, or null. */
  assignment: Assignment | null;
  messages: ChatMessage[];
  /** The visitor's messages not yet seen (the dot on Message). */
  unread: number;
  /** The request an Accept is in flight for. */
  accepting: string | null;
  notice: DeskNotice | null;
}

export const INITIAL_DESK: DeskState = { open: [], assignment: null, messages: [], unread: 0, accepting: null, notice: null };

export function createDeskStore(backend: VolunteerBackend) {
  let state = INITIAL_DESK;
  const listeners = new Set<() => void>();
  let owner: string | null = null;
  let restored = false;
  /** Bumped on every user change, so late answers for the previous user are dropped. */
  let generation = 0;
  let senderLanguage: string | null = null;
  let stopChat: (() => void) | null = null;

  const live = !!(backend.watchOpenRequests && backend.acceptRequest);

  function set(patch: Partial<DeskState>) {
    state = { ...state, ...patch };
    listeners.forEach(l => l());
  }

  function leaveChat() {
    stopChat?.();
    stopChat = null;
  }

  function receive(requestId: string, message: ChatMessage) {
    if (state.assignment?.id !== requestId || state.messages.some(m => m.id === message.id)) return;
    set({ messages: [...state.messages, message], unread: state.unread + (message.from === 'them' ? 1 : 0) });
  }

  function closed(requestId: string, how: RequestClosed) {
    const a = state.assignment;
    if (!a || a.id !== requestId) return;
    leaveChat();
    const key = how.byMe ? 'ended' : how.status;
    set({ assignment: null, messages: [], unread: 0, notice: { tone: 'success', key, params: { name: a.visitorName } } });
  }

  /** Shows `assignment` and follows its chat: the messages so far, then new ones, until it closes. */
  function join(assignment: Assignment, mine: number) {
    leaveChat();
    set({ assignment, messages: [], unread: 0, open: state.open.filter(r => r.id !== assignment.id) });
    const id = assignment.id;
    backend.loadMessages?.(id).then(
      history => {
        if (mine !== generation || state.assignment?.id !== id) return;
        const have = new Set(state.messages.map(m => m.id));
        const merged = [...history.filter(m => !have.has(m.id)), ...state.messages].sort((x, y) => x.sentAt - y.sentAt);
        set({ messages: merged });
      },
      () => {},
    );
    const offMessage = backend.onMessage(id, m => receive(id, m));
    const offClosed = backend.onClosed?.(id, how => closed(id, how));
    stopChat = () => {
      offMessage();
      offClosed?.();
    };
  }

  function clear() {
    leaveChat();
    generation += 1;
    state = INITIAL_DESK;
    listeners.forEach(l => l());
  }

  return {
    /** True when the backend has real open requests (Supabase); false keeps the examples. */
    live,
    getState: () => state,
    isRestored: () => restored,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    /** Keeps `open` up to date while the list is on screen. Returns a stop function. */
    watchOpen(): () => void {
      if (!backend.watchOpenRequests) return () => {};
      const mine = generation;
      const stop = backend.watchOpenRequests(open => {
        if (mine !== generation) return;
        const taken = state.assignment?.id;
        set({ open: taken ? open.filter(r => r.id !== taken) : open });
      });
      return () => {
        stop();
        if (mine === generation) set({ open: [] });
      };
    },

    /**
     * Takes an open request. True when this volunteer got it; false when someone else did first
     * ("already taken" notice) or it failed (e.g. offline).
     */
    async accept(requestId: string): Promise<boolean> {
      if (!backend.acceptRequest || state.accepting || state.assignment) return false;
      const mine = generation;
      set({ accepting: requestId, notice: null });
      try {
        const assignment = await backend.acceptRequest(requestId);
        if (mine !== generation) return false;
        set({ accepting: null });
        join(assignment, mine);
        return true;
      } catch (e) {
        if (mine !== generation) return false;
        const taken = e instanceof AlreadyTakenError;
        set({
          accepting: null,
          open: taken ? state.open.filter(r => r.id !== requestId) : state.open,
          notice: { tone: 'error', key: taken ? 'taken' : 'acceptFailed' },
        });
        return false;
      }
    },

    sendMessage(text: string) {
      const body = text.trim();
      const id = state.assignment?.id;
      if (!body || !id) return;
      const lang = senderLanguage ? { lang: senderLanguage } : {};
      set({ messages: [...state.messages, { id: newId('msg'), from: 'me', text: body, sentAt: Date.now(), ...lang }] });
      backend.sendMessage(id, body, senderLanguage).catch(() => {});
    },

    markRead() {
      if (state.unread) set({ unread: 0 });
    },

    /** The volunteer ends the chat: the help is done, and the visitor is asked for feedback. */
    endChat() {
      const id = state.assignment?.id;
      if (!id) return;
      closed(id, { status: 'done', byMe: true });
      backend.endHelp(id).catch(() => {});
    },

    /** Ends the volunteer's chat on the server while still signed in (runs just before sign-out). */
    async endSession(): Promise<void> {
      const id = state.assignment?.id;
      if (id) await backend.endHelp(id);
    },

    dismissNotice() {
      if (state.notice) set({ notice: null });
    },

    setLanguage(lang: string | null) {
      senderLanguage = lang;
    },

    /**
     * Called as the session changes. A volunteer signing in gets back the request they accepted (if
     * it's still on); anyone else, or signing out, starts empty.
     */
    async setUser(userId: string | null, isVolunteer = true): Promise<void> {
      const who = userId && isVolunteer ? userId : null;
      if (who === owner && (restored || who !== null)) return;
      clear();
      owner = who;
      restored = false;
      const mine = generation;
      try {
        const assignment = who && backend.currentAssignment ? await backend.currentAssignment() : null;
        if (assignment && mine === generation) join(assignment, mine);
      } catch {
        // Offline: start without it; the next sign-in tries again.
      } finally {
        if (mine === generation) {
          restored = true;
          listeners.forEach(l => l());
        }
      }
    },
  };
}

export type DeskStore = ReturnType<typeof createDeskStore>;

/** The app's volunteer desk, on the same backend as the visitor's requests. */
export const volunteerDesk: DeskStore = createDeskStore(appBackend);

onBeforeSignOut(() => volunteerDesk.endSession());

export function useVolunteerDesk(store: DeskStore = volunteerDesk): DeskState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useDeskRestored(store: DeskStore = volunteerDesk): boolean {
  return useSyncExternalStore(store.subscribe, store.isRestored, store.isRestored);
}
