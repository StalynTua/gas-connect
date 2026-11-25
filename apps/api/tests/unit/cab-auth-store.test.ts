import { describe, it, expect, beforeEach } from 'vitest';
import { buildAuthStore } from '../../../cab-pwa/src/application/auth-store.js';
import type { ICabApiClient } from '../../../cab-pwa/src/domain/api-contracts.js';
import type { AuthStorageAdapter } from '../../../cab-pwa/src/infrastructure/auth-storage.adapter.js';
import type { AuthSession } from '../../../cab-pwa/src/domain/auth.types.js';

describe('Cab PWA - Auth Store & Session Management', () => {
  let inMemorySession: AuthSession | null = null;

  const mockStorage: AuthStorageAdapter = {
    getStoredSession: () => inMemorySession,
    setStoredSession: (session: AuthSession) => {
      inMemorySession = session;
    },
    clearStoredSession: () => {
      inMemorySession = null;
    },
  };

  let lastUpdatedTruckStatus: { truckId: string; status: string } | null = null;

  const mockApiClient: ICabApiClient = {
    login: async (credentials) => {
      if (credentials.licensePlate === 'IAA-1041' && credentials.password === 'GasIbarra2025!') {
        return {
          success: true,
          token: 'token-uuid-1234',
          truckId: 'truck-ceibos-1',
          licensePlate: 'IAA-1041',
          helperName: 'Luis Muenala',
        };
      }
      return {
        success: false,
        error: 'Credenciales inválidas',
      };
    },
    logout: async () => ({ success: true }),
    postDispatchDecision: async () => ({ success: true }),
    completeOrder: async () => ({ success: true }),
    sendTelemetry: async () => ({ success: true }),
    syncWithBackend: async () => ({ success: true }),
    simulateOrder: async () => null,
    updateTruckStatus: async (truckId, status) => {
      lastUpdatedTruckStatus = { truckId, status };
      return { success: true };
    },
  };

  beforeEach(() => {
    inMemorySession = null;
    lastUpdatedTruckStatus = null;
  });

  it('starts unauthenticated when no session is in storage', () => {
    const useAuth = buildAuthStore(mockApiClient, mockStorage);
    const state = useAuth.getState();

    expect(state.isAuthenticated).toBe(false);
    expect(state.session).toBeNull();
    expect(state.error).toBeNull();
  });

  it('initializes as authenticated if valid session exists in storage', () => {
    inMemorySession = {
      token: 'persisted-token',
      truckId: 'truck-caranqui-2',
      licensePlate: 'IAB-2082',
      helperName: 'Jorge Quilumba',
    };

    const useAuth = buildAuthStore(mockApiClient, mockStorage);
    const state = useAuth.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.session?.licensePlate).toBe('IAB-2082');
    expect(state.session?.truckId).toBe('truck-caranqui-2');
  });

  it('handles invalid login and sets error message', async () => {
    const useAuth = buildAuthStore(mockApiClient, mockStorage);
    const success = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'wrong_password',
    });

    expect(success).toBe(false);
    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Credenciales inválidas');
    expect(inMemorySession).toBeNull();
  });

  it('handles valid login, persists session in storage, and updates state', async () => {
    const useAuth = buildAuthStore(mockApiClient, mockStorage);
    const success = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'GasIbarra2025!',
    });

    expect(success).toBe(true);
    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.session?.token).toBe('token-uuid-1234');
    expect(state.session?.truckId).toBe('truck-ceibos-1');
    expect(state.session?.licensePlate).toBe('IAA-1041');
    expect(state.error).toBeNull();

    // Verify storage persistence
    expect(inMemorySession?.truckId).toBe('truck-ceibos-1');
    expect(inMemorySession?.token).toBe('token-uuid-1234');
  });

  it('logout notifies backend of OFF_DUTY, clears session, storage, and resets authentication state', async () => {
    inMemorySession = {
      token: 'persisted-token',
      truckId: 'truck-ceibos-1',
      licensePlate: 'IAA-1041',
      helperName: 'Luis Muenala',
    };

    const useAuth = buildAuthStore(mockApiClient, mockStorage);
    expect(useAuth.getState().isAuthenticated).toBe(true);

    await useAuth.getState().logout();

    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.session).toBeNull();
    expect(inMemorySession).toBeNull();
    expect(lastUpdatedTruckStatus).toEqual({
      truckId: 'truck-ceibos-1',
      status: 'OFF_DUTY',
    });
  });

  it('handles invalid login with attemptsRemaining and records count in state', async () => {
    const clientWithAttempts: ICabApiClient = {
      ...mockApiClient,
      login: async () => ({
        success: false,
        error: 'Contraseña incorrecta',
        attemptsRemaining: 2,
      }),
    };

    const useAuth = buildAuthStore(clientWithAttempts, mockStorage);
    const success = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'wrong_password',
    });

    expect(success).toBe(false);
    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Contraseña incorrecta');
    expect(state.attemptsRemaining).toBe(2);
    expect(state.isLocked).toBe(false);
  });

  it('transitions to locked state when account lockout is signaled', async () => {
    const lockoutClient: ICabApiClient = {
      ...mockApiClient,
      login: async () => ({
        success: false,
        error: 'Acceso temporalmente bloqueado',
        isLocked: true,
        statusCode: 423,
        lockedUntil: '2026-10-05T04:00:00.000Z',
        attemptsRemaining: 0,
      }),
    };

    const useAuth = buildAuthStore(lockoutClient, mockStorage);
    const success = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'wrong_password',
    });

    expect(success).toBe(false);
    const state = useAuth.getState();
    expect(state.isLocked).toBe(true);
    expect(state.attemptsRemaining).toBe(0);
    expect(state.lockedUntil).toBe('2026-10-05T04:00:00.000Z');
    expect(state.error).toBe('Acceso temporalmente bloqueado');

    // Attempting login while locked immediately aborts and returns false
    let called = false;
    const trackingClient: ICabApiClient = {
      ...mockApiClient,
      login: async () => {
        called = true;
        return { success: false };
      },
    };
    useAuth.setState({ isLocked: true });
    const blockedSuccess = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'GasIbarra2025!',
    });
    expect(blockedSuccess).toBe(false);
    expect(called).toBe(false);
  });

  it('resets lockout and error state when resetLockout is called', async () => {
    const useAuth = buildAuthStore(mockApiClient, mockStorage);
    useAuth.setState({
      isLocked: true,
      attemptsRemaining: 0,
      lockedUntil: '2026-10-05T04:00:00.000Z',
      error: 'Bloqueado',
    });

    useAuth.getState().resetLockout();

    const state = useAuth.getState();
    expect(state.isLocked).toBe(false);
    expect(state.attemptsRemaining).toBeNull();
    expect(state.lockedUntil).toBeNull();
    expect(state.error).toBeNull();
  });

  it('clears attemptsRemaining, lockedUntil, and isLocked upon successful login', async () => {
    const useAuth = buildAuthStore(mockApiClient, mockStorage);
    useAuth.setState({
      attemptsRemaining: 1,
      error: 'Error anterior',
      isLocked: false,
    });

    const success = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'GasIbarra2025!',
    });

    expect(success).toBe(true);
    const state = useAuth.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.error).toBeNull();
    expect(state.attemptsRemaining).toBeNull();
    expect(state.isLocked).toBe(false);
    expect(state.lockedUntil).toBeNull();
  });

  it('tracks isLoading as true while login request is in-flight', async () => {
    let resolveLogin!: (value: any) => void;
    const delayedClient: ICabApiClient = {
      ...mockApiClient,
      login: () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    };

    const useAuth = buildAuthStore(delayedClient, mockStorage);
    expect(useAuth.getState().isLoading).toBe(false);

    const loginPromise = useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'GasIbarra2025!',
    });

    expect(useAuth.getState().isLoading).toBe(true);

    resolveLogin({
      success: true,
      token: 'token-uuid-1234',
      truckId: 'truck-ceibos-1',
      licensePlate: 'IAA-1041',
      helperName: 'Luis Muenala',
    });

    const success = await loginPromise;
    expect(success).toBe(true);
    expect(useAuth.getState().isLoading).toBe(false);
  });

  it('handles network exceptions gracefully and records error message', async () => {
    const errorClient: ICabApiClient = {
      ...mockApiClient,
      login: async () => {
        throw new Error('Connection refused');
      },
    };

    const useAuth = buildAuthStore(errorClient, mockStorage);
    const success = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'GasIbarra2025!',
    });

    expect(success).toBe(false);
    const state = useAuth.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Error de red al intentar conectar con el servidor');
  });

  it('automatically unlocks when lockedUntil timestamp has elapsed', async () => {
    let loginCalled = false;
    const trackingClient: ICabApiClient = {
      ...mockApiClient,
      login: async () => {
        loginCalled = true;
        return {
          success: true,
          token: 'token-uuid-1234',
          truckId: 'truck-ceibos-1',
          licensePlate: 'IAA-1041',
          helperName: 'Luis Muenala',
        };
      },
    };

    const useAuth = buildAuthStore(trackingClient, mockStorage);
    const pastTimestamp = new Date(Date.now() - 5000).toISOString();
    useAuth.setState({
      isLocked: true,
      lockedUntil: pastTimestamp,
      error: 'Acceso bloqueado',
    });

    const success = await useAuth.getState().login({
      licensePlate: 'IAA-1041',
      password: 'GasIbarra2025!',
    });

    expect(loginCalled).toBe(true);
    expect(success).toBe(true);
    const state = useAuth.getState();
    expect(state.isLocked).toBe(false);
    expect(state.lockedUntil).toBeNull();
    expect(state.isAuthenticated).toBe(true);
  });
});
