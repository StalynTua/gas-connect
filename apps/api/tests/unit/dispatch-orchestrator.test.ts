import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DispatchOrchestratorService } from '../../src/modules/dispatch/dispatch-orchestrator.service.js';
import { CandidateTruck } from '../../src/modules/dispatch/truck-finder.service.js';

describe('Dispatch Orchestrator & 45s Cascading Offers', () => {
  let orchestrator: DispatchOrchestratorService;

  const mockCandidates: CandidateTruck[] = [
    {
      id: 'truck-1',
      licensePlate: 'IAA-1041',
      driverName: 'Carlos Perez',
      helperName: 'Luis Muenala',
      helperPhone: '0998877661',
      currentStockFull: 40,
      latitude: 0.348,
      longitude: -78.128,
      radialDistanceMeters: 300,
      roadDistanceMeters: 380,
      etaMinutes: 2.5,
    },
    {
      id: 'truck-2',
      licensePlate: 'IAB-2082',
      driverName: 'Marco Imbaquingo',
      helperName: 'Jorge Quilumba',
      helperPhone: '0998877662',
      currentStockFull: 35,
      latitude: 0.342,
      longitude: -78.122,
      radialDistanceMeters: 750,
      roadDistanceMeters: 900,
      etaMinutes: 4.8,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    orchestrator = new DispatchOrchestratorService(45);
  });

  it('should immediately offer to candidate 0 when order starts', async () => {
    const session = await orchestrator.startDispatch({
      orderId: 'order-101',
      quantityRequested: 2,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates,
    });

    expect(session.status).toBe('OFFERED');
    expect(session.currentCandidateIndex).toBe(0);
    expect(session.candidates[0].id).toBe('truck-1');
  });

  it('should assign order when truck-1 accepts', async () => {
    await orchestrator.startDispatch({
      orderId: 'order-102',
      quantityRequested: 2,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates,
    });

    const result = orchestrator.handleDecision('order-102', 'truck-1', 'ACCEPTED');

    expect(result.success).toBe(true);
    expect(result.sessionStatus).toBe('ASSIGNED');
    expect(result.assignedTruck?.id).toBe('truck-1');
  });

  it('should cascade to truck-2 if truck-1 rejects', async () => {
    await orchestrator.startDispatch({
      orderId: 'order-103',
      quantityRequested: 2,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates,
    });

    const result = orchestrator.handleDecision('order-103', 'truck-1', 'REJECTED');

    expect(result.success).toBe(true);
    expect(result.sessionStatus).toBe('OFFERED');

    const session = orchestrator.getSession('order-103');
    expect(session?.currentCandidateIndex).toBe(1);
    expect(session?.candidates[1].id).toBe('truck-2');
  });

  it('should cascade to truck-2 when 45 seconds timeout expires', async () => {
    await orchestrator.startDispatch({
      orderId: 'order-104',
      quantityRequested: 2,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates,
    });

    // Avanzar reloj 45 segundos
    vi.advanceTimersByTime(45000);

    const session = orchestrator.getSession('order-104');
    expect(session?.status).toBe('OFFERED');
    expect(session?.currentCandidateIndex).toBe(1);
  });

  it('should expire session if all candidates timeout', async () => {
    await orchestrator.startDispatch({
      orderId: 'order-105',
      quantityRequested: 2,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates,
    });

    // Timeout truck-1 (45s) -> Pasa a truck-2
    vi.advanceTimersByTime(45000);
    // Timeout truck-2 (45s) -> Fin de candidatos
    vi.advanceTimersByTime(45000);

    const session = orchestrator.getSession('order-105');
    expect(session?.status).toBe('EXPIRED');
  });

  it('should return NO_TRUCKS_AVAILABLE if candidates array is empty', async () => {
    const session = await orchestrator.startDispatch({
      orderId: 'order-106',
      quantityRequested: 2,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates: [],
    });

    expect(session.status).toBe('NO_TRUCKS_AVAILABLE');
  });
});
