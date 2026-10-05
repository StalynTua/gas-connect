import { useSyncExternalStore } from 'react';
import type { AuthSession, LoginCredentials } from '../domain/auth.types.js';
import type { ICabApiClient } from '../domain/api-contracts.js';
import { cabApiClient } from '../infrastructure/cab-api.client.js';
import { authStorageAdapter, AuthStorageAdapter } from '../infrastructure/auth-storage.adapter.js';
import { cabCentrifugoAdapter } from '../infrastructure/centrifugo.adapter.js';

export interface AuthStoreState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

type SetStateAction<T> = Partial<T> | ((prev: T) => Partial<T>);

function createStore<T>(initialStateFn: (set: (action: SetStateAction<T>) => void, get: () => T) => T) {
  let state: T;
  const listeners = new Set<() => void>();

  const get = () => state;

  const set = (action: SetStateAction<T>) => {
    const update = typeof action === 'function' ? (action as (prev: T) => Partial<T>)(state) : action;
    state = { ...state, ...update };
    listeners.forEach((listener) => listener());
  };

  state = initialStateFn(set, get);

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useStore = () => useSyncExternalStore(subscribe, get, get);
  useStore.getState = get;
  useStore.setState = (update: Partial<T>) => set(update);
  useStore.subscribe = subscribe;

  return useStore;
}

export function buildAuthStore(
  client: ICabApiClient = cabApiClient,
  storage: AuthStorageAdapter = authStorageAdapter
) {
  const initialSession = storage.getStoredSession();

  return createStore<AuthStoreState>((set, get) => ({
    session: initialSession,
    isAuthenticated: Boolean(initialSession && initialSession.token),
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    login: async (credentials: LoginCredentials) => {
      set({ isLoading: true, error: null });

      try {
        const res = await client.login(credentials);
        if (res.success && res.token && res.truckId && res.licensePlate) {
          const session: AuthSession = {
            token: res.token,
            truckId: res.truckId,
            licensePlate: res.licensePlate,
            helperName: res.helperName || 'Ayudante',
          };

          storage.setStoredSession(session);

          set({
            session,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        }

        set({
          isLoading: false,
          error: res.error || 'Credenciales inválidas',
        });
        return false;
      } catch (err) {
        set({
          isLoading: false,
          error: 'Error de red al intentar conectar con el servidor',
        });
        return false;
      }
    },

    logout: async () => {
      const { session } = get();
      if (session?.truckId) {
        // Notificar al backend que el camión pasa a estado inactivo (OFF_DUTY)
        await client.updateTruckStatus(session.truckId, 'OFF_DUTY').catch(() => {});
      }

      if (session?.token) {
        // Notificar al backend sin bloquear si no hay conexión
        await client.logout(session.token).catch(() => {});
      }

      // Desconectar socket Centrifugo
      cabCentrifugoAdapter.disconnect();

      // Limpiar almacenamiento local
      storage.clearStoredSession();

      set({
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    },
  }));
}

export const useAuthStore = buildAuthStore();
