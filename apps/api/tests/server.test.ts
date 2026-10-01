import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { dispatchOrchestrator } from '../src/modules/dispatch/dispatch-orchestrator.service.js';
import { fleetService } from '../src/modules/fleet/fleet.service.js';

describe('Fastify Server APIs & Dispatch Workflow', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    server = buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/health should return status ok', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('gasconnect-ibarra-api');
    expect(body.timestamp).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });

  it('POST /api/v1/dispatch/decision should handle helper acceptance and transition truck to IN_TRANSIT', async () => {
    // Asegurar estado inicial en IDLE
    await fleetService.updateTruckStatus('truck-caranqui-2', 'IDLE');

    // Iniciar una sesión previa en el orquestador
    await dispatchOrchestrator.startDispatch({
      orderId: 'order-test-api-1',
      quantityRequested: 1,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates: [
        {
          id: 'truck-caranqui-2',
          licensePlate: 'IAA-2052',
          driverName: 'Wilson Imbaquingo',
          helperName: 'Segundo Farinango',
          helperPhone: '0992223344',
          currentStockFull: 34,
          latitude: 0.3312,
          longitude: -78.1345,
          radialDistanceMeters: 200,
          roadDistanceMeters: 250,
          etaMinutes: 2,
        },
      ],
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: {
        orderId: 'order-test-api-1',
        truckId: 'truck-caranqui-2',
        decision: 'ACCEPTED',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.sessionStatus).toBe('ASSIGNED');
    expect(body.assignedTruck.id).toBe('truck-caranqui-2');

    // Comprobar que el camión ahora figura IN_TRANSIT en la flota
    const fleet = await fleetService.getFleetStatus();
    const truck = fleet.find((t) => t.id === 'truck-caranqui-2');
    expect(truck?.status).toBe('IN_TRANSIT');
  });

  it('POST /api/v1/orders/complete should return success and reset truck to IDLE', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: {
        orderId: 'order-test-api-1',
        truckId: 'truck-caranqui-2',
        quantityDelivered: 1,
        amountCollected: 3.0,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.remainingStock).toBeDefined();

    // Comprobar que el camión vuelve a IDLE tras completarse la entrega
    const fleet = await fleetService.getFleetStatus();
    const truck = fleet.find((t) => t.id === 'truck-caranqui-2');
    expect(truck?.status).toBe('IDLE');
  });
});
