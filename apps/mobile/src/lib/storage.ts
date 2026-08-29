import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HouseholdResponse, UserResponse } from '../types/api';

const SESSION_KEY = 'tazkiyah_session';

export interface PersistedSession {
  user: UserResponse;
  household: HouseholdResponse;
}

export async function saveSession(session: PersistedSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Failed to persist session:', err);
  }
}

export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (parsed?.user?.id && parsed?.household?.id) return parsed;
    return null;
  } catch (err) {
    console.warn('Failed to read persisted session:', err);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.warn('Failed to clear session:', err);
  }
}
