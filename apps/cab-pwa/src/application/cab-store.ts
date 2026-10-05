import { useSyncExternalStore } from 'react';
import type { CabStoreState, ActiveOffer, CabState } from '../domain/cab-state.types.js';
import type { ICabApiClient } from '../domain/api-contracts.js';
import { cabApiClient } from '../infrastructure/cab-api.client.js';
import { cabAudioAlarm } from '../infrastructure/audio-alarm.adapter.js';
import { authStorageAdapter } from '../infrastructure/auth-storage.adapter.js';

export type { CabStoreState, ActiveOffer, CabState };

type SetStateAction<T> = Partial<T> | ((prev: T) => Partial<T>);

// Micro-store reactivo zero-dependency (< 20 líneas) compatible con SSR/Node y Browser
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

export function buildCabStore(client: ICabApiClient = cabApiClient) {
  const initialSession = authStorageAdapter.getStoredSession();

  return createStore<CabStoreState>((set, get) => ({
    truckId: initialSession?.truckId ?? '',
    licensePlate: initialSession?.licensePlate ?? '',
    helperName: initialSession?.helperName ?? '',
    stockFull: 40,
    stockEmpty: 0,
    state: 'IDLE',
    activeOffer: null,
    activeOrder: null,
    isConnected: true,
    isDBSynced: true,

    setTruckInfo: (info) =>
      set({
        truckId: info.truckId,
        licensePlate: info.licensePlate,
        helperName: info.helperName,
        stockFull: info.stock ?? get().stockFull,
      }),

    setConnectionStatus: (connected) => set({ isConnected: connected }),

    receiveOffer: (offer) => {
      set({
        activeOffer: offer,
        state: 'OFFERED',
      });
      cabAudioAlarm.startAlarm();
    },

    acceptOffer: async () => {
      const { activeOffer, truckId } = get();
      if (!activeOffer) return;

      cabAudioAlarm.stopAlarm();

      set({
        activeOrder: activeOffer,
        activeOffer: null,
        state: 'IN_TRANSIT',
      });

      // 1. Notificar inmediatamente al backend para poner el camión en ruta y publicar a Centrifugo
      await client.updateTruckStatus(truckId, 'IN_TRANSIT');

      // 2. Registrar la decisión de despacho en el orquestador
      await client.postDispatchDecision({
        orderId: activeOffer.orderId,
        truckId,
        decision: 'ACCEPTED',
      });
    },

    rejectOffer: async () => {
      const { activeOffer, truckId } = get();
      if (!activeOffer) return;

      cabAudioAlarm.stopAlarm();

      set({
        activeOffer: null,
        state: 'IDLE',
      });

      await client.postDispatchDecision({
        orderId: activeOffer.orderId,
        truckId,
        decision: 'REJECTED',
        reason: 'Rechazado por ayudante en cabina',
      });
    },

    completeDelivery: async () => {
      const { activeOrder, truckId, stockFull, stockEmpty } = get();
      if (!activeOrder) return;

      const quantity = activeOrder.quantity;
      const newStockFull = Math.max(0, stockFull - quantity);
      const newStockEmpty = stockEmpty + quantity;

      set({
        stockFull: newStockFull,
        stockEmpty: newStockEmpty,
        activeOrder: null,
        state: 'IDLE',
      });

      // 1. Notificar retorno a estado IDLE (Disponible) en la flota y Centrifugo
      await client.updateTruckStatus(truckId, 'IDLE');

      // 2. Registrar la orden completada
      await client.completeOrder({
        orderId: activeOrder.orderId,
        truckId,
        quantityDelivered: quantity,
        paymentMethod: 'CASH',
        amountCollected: activeOrder.totalPrice,
      });
    },

    setTruckStatus: async (status: 'IDLE' | 'IN_TRANSIT') => {
      const { truckId } = get();
      set({ state: status });
      await client.updateTruckStatus(truckId, status);
    },

    setDutyStatus: async (status: 'IDLE' | 'OFF_DUTY') => {
      const { truckId, state } = get();
      if (state === 'IN_TRANSIT') return;
      set({ state: status });
      if (truckId) {
        await client.updateTruckStatus(truckId, status);
      }
    },

    decrementStock: (qty) => {
      const { stockFull, stockEmpty } = get();
      set({
        stockFull: Math.max(0, stockFull - qty),
        stockEmpty: stockEmpty + qty,
      });
    },

    syncWithBackend: async () => {
      const { truckId } = get();
      if (!truckId) return;
      const res = await client.syncWithBackend(truckId);
      if (res.success && res.truck) {
        set({
          licensePlate: res.truck.plateNumber,
          helperName: res.truck.helperName,
          stockFull: res.truck.stock,
          isDBSynced: true,
        });
      } else {
        set({ isDBSynced: false });
      }
    },

    sendTelemetry: async (lat, lng) => {
      const { truckId, stockFull, state } = get();
      if (!truckId || state === 'OFF_DUTY') return;
      const latitude = lat ?? 0.3475;
      const longitude = lng ?? -78.1285;
      const operationalStatus = state === 'IN_TRANSIT' ? 'IN_TRANSIT' : 'IDLE';

      const res = await client.sendTelemetry({
        truckId,
        latitude,
        longitude,
        currentStock: stockFull,
        status: operationalStatus,
      });
      set({ isDBSynced: res.success });
    },
  }));
}

export const useCabStore = buildCabStore();
