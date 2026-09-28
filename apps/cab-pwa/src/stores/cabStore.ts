import { useSyncExternalStore } from 'react';

export interface ActiveOffer {
  dispatchAttemptId: string;
  orderId: string;
  timeoutSeconds: number;
  cylinderType: 'DOMESTIC_15KG' | 'INDUSTRIAL_45KG';
  quantity: number;
  totalPrice: number;
  hasEmptyCylinders: boolean;
  customerSector: string;
  landmark: string;
  estimatedDetourMeters: number;
  estimatedEtaMinutes: number;
  destination: {
    latitude: number;
    longitude: number;
  };
}

export type CabState = 'IDLE' | 'OFFERED' | 'IN_TRANSIT' | 'RESTOCKING';

export interface CabStoreState {
  truckId: string;
  licensePlate: string;
  helperName: string;
  stockFull: number;
  stockEmpty: number;
  state: CabState;
  activeOffer: ActiveOffer | null;
  activeOrder: ActiveOffer | null;
  isConnected: boolean;
  isDBSynced: boolean;

  setTruckInfo: (info: { truckId: string; licensePlate: string; helperName: string; stock: number }) => void;
  setConnectionStatus: (connected: boolean) => void;
  receiveOffer: (offer: ActiveOffer) => void;
  acceptOffer: () => Promise<void>;
  rejectOffer: () => Promise<void>;
  completeDelivery: () => Promise<void>;
  decrementStock: (qty: number) => void;
  syncWithBackend: () => Promise<void>;
  sendTelemetry: (lat?: number, lng?: number) => Promise<void>;
}

type SetStateAction<T> = Partial<T> | ((prev: T) => Partial<T>);

// Micro-store reactivo zero-dependency (< 20 líneas) compatible con Node y Browser
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

async function apiFetch(path: string, init?: RequestInit) {
  if (typeof window === 'undefined') {
    return { ok: false, json: async () => ({}) } as Response;
  }
  return fetch(path, init);
}

export const useCabStore = createStore<CabStoreState>((set, get) => ({
  truckId: 'truck-ceibos-1',
  licensePlate: 'IAA-1041',
  helperName: 'Luis Muenala',
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
      stockFull: info.stock,
    }),

  setConnectionStatus: (connected) => set({ isConnected: connected }),

  receiveOffer: (offer) =>
    set({
      state: 'OFFERED',
      activeOffer: offer,
    }),

  acceptOffer: async () => {
    const { activeOffer, truckId } = get();
    if (activeOffer) {
      set((state) => ({
        state: 'IN_TRANSIT',
        activeOrder: state.activeOffer,
        activeOffer: null,
      }));

      try {
        await apiFetch('/api/v1/dispatch/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: activeOffer.orderId,
            truckId,
            decision: 'ACCEPTED',
          }),
        });
        set({ isDBSynced: true });
      } catch (err) {
        console.warn('Persistencia en BD diferida (modo offline):', err);
        set({ isDBSynced: false });
      }
    }
  },

  rejectOffer: async () => {
    const { activeOffer, truckId } = get();
    if (activeOffer) {
      const currentOffer = activeOffer;
      set({
        state: 'IDLE',
        activeOffer: null,
      });

      try {
        await apiFetch('/api/v1/dispatch/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: currentOffer.orderId,
            truckId,
            decision: 'REJECTED',
          }),
        });
        set({ isDBSynced: true });
      } catch (err) {
        console.warn('Persistencia en BD diferida (modo offline):', err);
        set({ isDBSynced: false });
      }
    }
  },

  completeDelivery: async () => {
    const { activeOrder, truckId, stockFull, stockEmpty } = get();
    if (!activeOrder) return;

    const deliveredQty = activeOrder.quantity || 1;
    const newStockFull = Math.max(0, stockFull - deliveredQty);
    const newStockEmpty = stockEmpty + deliveredQty;

    set({
      state: newStockFull <= 0 ? 'RESTOCKING' : 'IDLE',
      activeOrder: null,
      stockFull: newStockFull,
      stockEmpty: newStockEmpty,
    });

    try {
      const res = await apiFetch('/api/v1/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          truckId,
          quantityDelivered: deliveredQty,
          paymentMethod: 'CASH',
          amountCollected: activeOrder.totalPrice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.remainingStock === 'number') {
          set({ stockFull: data.remainingStock, isDBSynced: true });
        }
      }
    } catch (err) {
      console.warn('Persistencia de entrega en BD en segundo plano:', err);
      set({ isDBSynced: false });
    }
  },

  decrementStock: (qty) =>
    set((state) => ({
      stockFull: Math.max(0, state.stockFull - qty),
      stockEmpty: state.stockEmpty + qty,
    })),

  syncWithBackend: async () => {
    try {
      const res = await apiFetch('/api/v1/fleet/status');
      if (res.ok) {
        const data = await res.json();
        const { truckId } = get();
        const dbTruck = data.trucks?.find((t: { id: string }) => t.id === truckId);
        if (dbTruck) {
          set({
            licensePlate: dbTruck.licensePlate || get().licensePlate,
            helperName: dbTruck.helperName || get().helperName,
            stockFull: dbTruck.currentStockFull ?? get().stockFull,
            stockEmpty: dbTruck.currentStockEmpty ?? get().stockEmpty,
            isConnected: true,
            isDBSynced: true,
          });
        }
      }
    } catch {
      set({ isConnected: false });
    }
  },

  sendTelemetry: async (lat = 0.3475, lng = -78.1285) => {
    const { truckId, stockFull } = get();
    try {
      await apiFetch('/api/v1/trucks/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId,
          latitude: lat,
          longitude: lng,
          currentStock: stockFull,
        }),
      });
      set({ isConnected: true, isDBSynced: true });
    } catch {
      set({ isConnected: false });
    }
  },
}));

