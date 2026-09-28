import { describe, it, expect, beforeEach } from 'vitest';
import { useCabStore, ActiveOffer } from '../../apps/cab-pwa/src/stores/cabStore.js';

describe('In-Cab PWA Helper Workflow & State Machine', () => {
  beforeEach(() => {
    useCabStore.setState({
      truckId: 'IAA-1041',
      licensePlate: 'IAA-1041',
      helperName: 'Luis Muenala',
      stockFull: 40,
      stockEmpty: 0,
      state: 'IDLE',
      activeOffer: null,
      activeOrder: null,
    });
  });

  const mockOffer: ActiveOffer = {
    dispatchAttemptId: 'attempt-101',
    orderId: 'order-101',
    timeoutSeconds: 45,
    cylinderType: 'DOMESTIC_15KG',
    quantity: 2,
    totalPrice: 6.0,
    hasEmptyCylinders: true,
    customerSector: 'Los Ceibos',
    landmark: 'Casa amarilla reja negra',
    estimatedDetourMeters: 300,
    estimatedEtaMinutes: 2.5,
    destination: {
      latitude: 0.3475,
      longitude: -78.1285,
    },
  };

  it('should transition from IDLE to OFFERED when an offer arrives', () => {
    const store = useCabStore.getState();
    expect(store.state).toBe('IDLE');

    store.receiveOffer(mockOffer);

    const updated = useCabStore.getState();
    expect(updated.state).toBe('OFFERED');
    expect(updated.activeOffer?.orderId).toBe('order-101');
    expect(updated.activeOffer?.quantity).toBe(2);
  });

  it('should transition to IN_TRANSIT when helper accepts offer', () => {
    const store = useCabStore.getState();
    store.receiveOffer(mockOffer);
    store.acceptOffer();

    const updated = useCabStore.getState();
    expect(updated.state).toBe('IN_TRANSIT');
    expect(updated.activeOrder?.orderId).toBe('order-101');
    expect(updated.activeOffer).toBeNull();
  });

  it('should transition back to IDLE when helper rejects offer', () => {
    const store = useCabStore.getState();
    store.receiveOffer(mockOffer);
    store.rejectOffer();

    const updated = useCabStore.getState();
    expect(updated.state).toBe('IDLE');
    expect(updated.activeOffer).toBeNull();
  });

  it('should decrement full stock and increment empty stock on completeDelivery', () => {
    const store = useCabStore.getState();
    store.receiveOffer(mockOffer); // quantity = 2
    store.acceptOffer();
    store.completeDelivery();

    const updated = useCabStore.getState();
    expect(updated.state).toBe('IDLE');
    expect(updated.stockFull).toBe(38); // 40 - 2
    expect(updated.stockEmpty).toBe(2);
    expect(updated.activeOrder).toBeNull();
  });
});
