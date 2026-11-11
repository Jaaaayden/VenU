// The visitor's current help request: idle → searching → matched → done → idle.
// One in-memory store shared by the Volunteer tab and the chat screen (they're in different
// navigators, so a context provider would have to wrap the root layout). The backend is injected,
// so tests and the real service use the same store.
import { useSyncExternalStore } from 'react';

import { createMockBackend, newId, type VolunteerBackend } from './backend';
import type { ChatMessage, FeedbackTag, HelpRequest, Match, ProblemKind, RequestState } from './types';

export const INITIAL_STATE: RequestState = {
  status: 'idle',
  request: null,
  match: null,
  messages: [],
  unread: 0,
  notice: null,
};

export type RequestAction =
  | { type: 'search'; request: HelpRequest }
  | { type: 'matched'; requestId: string; match: Match }
  | { type: 'searchFailed'; requestId: string; text: string }
  | { type: 'cancel' }
  | { type: 'send'; message: ChatMessage }
  | { type: 'receive'; requestId: string; message: ChatMessage }
  | { type: 'read' }
  | { type: 'end' }
  | { type: 'finish'; notice: RequestState['notice'] }
  | { type: 'dismissNotice' };

/** Pure state transitions. Actions that don't fit the current status return the same state. */
export function reduce(state: RequestState, action: RequestAction): RequestState {
  switch (action.type) {
    case 'search':
      return state.status === 'idle' ? { ...INITIAL_STATE, status: 'searching', request: action.request } : state;
    case 'matched':
      return state.status === 'searching' && state.request?.id === action.requestId
        ? { ...state, status: 'matched', match: action.match }
        : state;
    case 'searchFailed':
      return state.status === 'searching' && state.request?.id === action.requestId
        ? { ...INITIAL_STATE, notice: { tone: 'error', text: action.text } }
        : state;
    case 'cancel':
      return state.status === 'searching' || state.status === 'matched' ? INITIAL_STATE : state;
    case 'send':
      return state.status === 'matched' ? { ...state, messages: [...state.messages, action.message] } : state;
    case 'receive':
      return state.status === 'matched' && state.request?.id === action.requestId
        ? { ...state, messages: [...state.messages, action.message], unread: state.unread + 1 }
        : state;
    case 'read':
      return state.unread ? { ...state, unread: 0 } : state;
    case 'end':
      return state.status === 'matched' ? { ...state, status: 'done', unread: 0 } : state;
    case 'finish':
      return state.status === 'done' ? { ...INITIAL_STATE, notice: action.notice } : state;
    case 'dismissNotice':
      return state.notice ? { ...state, notice: null } : state;
  }
}

export type NewRequest = Omit<HelpRequest, 'id' | 'createdAt'>;

export function createRequestStore(backend: VolunteerBackend) {
  let state = INITIAL_STATE;
  const listeners = new Set<() => void>();
  let search: AbortController | null = null;
  let unsubscribe: (() => void) | null = null;

  function dispatch(action: RequestAction) {
    const next = reduce(state, action);
    if (next === state) return;
    state = next;
    listeners.forEach(l => l());
  }

  function stopListening() {
    unsubscribe?.();
    unsubscribe = null;
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    /** Starts searching; resolves once matched, failed or cancelled. */
    async sendRequest(input: NewRequest): Promise<void> {
      if (state.status !== 'idle') return;
      const request: HelpRequest = { ...input, id: newId('req'), createdAt: Date.now() };
      dispatch({ type: 'search', request });
      const ctl = new AbortController();
      search = ctl;
      try {
        const match = await backend.findVolunteer(request, ctl.signal);
        if (search !== ctl) return;
        search = null;
        unsubscribe = backend.onMessage(request.id, message => dispatch({ type: 'receive', requestId: request.id, message }));
        dispatch({ type: 'matched', requestId: request.id, match });
      } catch {
        if (search !== ctl) return; // cancelled: cancel() already reset the state
        search = null;
        dispatch({ type: 'searchFailed', requestId: request.id, text: "Couldn't reach a volunteer. Check your connection and try again." });
      }
    },

    /** Stops searching or calls off the matched volunteer, back to the request form. */
    cancel() {
      const id = state.request?.id;
      search?.abort();
      search = null;
      stopListening();
      dispatch({ type: 'cancel' });
      if (id) backend.cancelRequest(id).catch(() => {});
    },

    sendMessage(text: string) {
      const body = text.trim();
      const id = state.request?.id;
      if (!body || !id || state.status !== 'matched') return;
      dispatch({ type: 'send', message: { id: newId('msg'), from: 'me', text: body, sentAt: Date.now() } });
      backend.sendMessage(id, body).catch(() => {});
    },

    markRead() {
      dispatch({ type: 'read' });
    },

    /** The help is over: ask for feedback. */
    endHelp() {
      const id = state.request?.id;
      if (state.status !== 'matched' || !id) return;
      stopListening();
      dispatch({ type: 'end' });
      backend.endHelp(id).catch(() => {});
    },

    async submitFeedback(stars: number, tags: FeedbackTag[], note: string) {
      const { request, match } = state;
      if (state.status !== 'done' || !request || !match) return;
      await backend.submitFeedback({ requestId: request.id, volunteerId: match.volunteer.id, stars, tags, note: note.trim() });
      dispatch({ type: 'finish', notice: { tone: 'success', text: `Thanks! Your feedback helps ${match.volunteer.firstName} and the LA28 team.` } });
    },

    async reportProblem(kind: ProblemKind, note: string) {
      const { request, match } = state;
      if (!request || !match) return;
      await backend.reportProblem({ requestId: request.id, volunteerId: match.volunteer.id, kind, note: note.trim() });
    },

    /** Leave feedback for later and go back to the request form. */
    skipFeedback() {
      dispatch({ type: 'finish', notice: null });
    },

    dismissNotice() {
      dispatch({ type: 'dismissNotice' });
    },
  };
}

export type RequestStore = ReturnType<typeof createRequestStore>;

/** The app's store. Swap createMockBackend() for the real service here. */
export const volunteerRequests: RequestStore = createRequestStore(createMockBackend());

export function useVolunteerRequest(store: RequestStore = volunteerRequests): RequestState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
