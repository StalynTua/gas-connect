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
});
