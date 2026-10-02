import type { AuthSession } from '../domain/auth.types.js';

const STORAGE_KEY_TOKEN = 'cab_auth_token';
const STORAGE_KEY_SESSION = 'cab_auth_session';

export class AuthStorageAdapter {
  getStoredSession(): AuthSession | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const token = localStorage.getItem(STORAGE_KEY_TOKEN);
      const rawSession = localStorage.getItem(STORAGE_KEY_SESSION);

      if (!token || !rawSession) {
        return null;
      }

      const parsed = JSON.parse(rawSession);
      if (!parsed.truckId || !parsed.licensePlate) {
        return null;
      }

      return {
        token,
        truckId: parsed.truckId,
        licensePlate: parsed.licensePlate,
        helperName: parsed.helperName || 'Ayudante',
      };
    } catch (err) {
      console.warn('[AuthStorageAdapter] Error loading session from localStorage:', err);
      return null;
    }
  }

  setStoredSession(session: AuthSession): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, session.token);
      localStorage.setItem(
        STORAGE_KEY_SESSION,
        JSON.stringify({
          truckId: session.truckId,
          licensePlate: session.licensePlate,
          helperName: session.helperName,
        })
      );
    } catch (err) {
      console.warn('[AuthStorageAdapter] Error saving session to localStorage:', err);
    }
  }

  clearStoredSession(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch (err) {
      console.warn('[AuthStorageAdapter] Error clearing session from localStorage:', err);
    }
  }
}

export const authStorageAdapter = new AuthStorageAdapter();
