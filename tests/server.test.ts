import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import { dispatchOrchestrator } from '../src/modules/dispatch/dispatch-orchestrator.service.js';

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

  it('POST /api/v1/dispatch/decision should handle helper acceptance', async () => {
    // Iniciar una sesión previa en el orquestador
    await dispatchOrchestrator.startDispatch({
      orderId: 'order-test-api-1',
      quantityRequested: 1,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates: [
        {
          id: 'truck-api-1',
          licensePlate: 'IAA-1041',
          driverName: 'Carlos Perez',
          helperName: 'Luis Muenala',
          helperPhone: '0998877661',
          currentStockFull: 40,
          latitude: 0.348,
          longitude: -78.128,
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
        truckId: 'truck-api-1',
        decision: 'ACCEPTED',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.sessionStatus).toBe('ASSIGNED');
    expect(body.assignedTruck.id).toBe('truck-api-1');
  });

  it('POST /api/v1/orders/complete should return success with remaining stock', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: {
        orderId: 'order-test-api-1',
        truckId: 'truck-api-1',
        quantityDelivered: 1,
        amountCollected: 3.0,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.remainingStock).toBeDefined();
  });
});
