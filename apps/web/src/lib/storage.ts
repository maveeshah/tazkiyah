import type { HouseholdResponse, UserResponse } from '../types/api';

const SESSION_KEY = 'tazkiyah_session';

export interface PersistedSession {
  user: UserResponse;
  household: HouseholdResponse;
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Failed to persist session:', err);
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed?.user?.id && parsed?.household?.id) return parsed;
    return null;
  } catch (err) {
    console.warn('Failed to read persisted session:', err);
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn('Failed to clear session:', err);
  }
}
