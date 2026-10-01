import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { fleetService } from '../../src/modules/fleet/fleet.service.js';

describe('Fleet Operations API & Service', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    server = buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/v1/fleet/status should return list of active trucks in Ibarra', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/fleet/status',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(4);
    expect(body.trucks[0]).toHaveProperty('licensePlate');
    expect(body.trucks[0]).toHaveProperty('currentStockFull');
  });

  it('GET /api/v1/fleet/metrics should calculate active trucks and low stock alerts', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/fleet/metrics',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.metrics.totalTrucksActive).toBeGreaterThanOrEqual(3);
    expect(body.metrics.totalStockAvailable).toBeGreaterThan(0);
    expect(body.metrics.lowStockAlertsCount).toBeGreaterThanOrEqual(1); // Truck Yacucalle has 4 cylinders
  });

  it('POST /api/v1/fleet/trucks/:id/telemetry should update truck coordinates', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/fleet/trucks/truck-ceibos-1/telemetry',
      payload: {
        latitude: 0.3499,
        longitude: -78.1299,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);

    const trucks = await fleetService.getFleetStatus();
    const updated = trucks.find((t) => t.id === 'truck-ceibos-1');
    expect(updated?.lastLatitude).toBe(0.3499);
    expect(updated?.lastLongitude).toBe(-78.1299);
  });

  it('updateTruckStatus should update status in memory and be reflected in getFleetStatus', async () => {
    await fleetService.updateTruckStatus('truck-caranqui-2', 'IN_TRANSIT');
    let trucks = await fleetService.getFleetStatus();
    let truck = trucks.find((t) => t.id === 'truck-caranqui-2');
    expect(truck?.status).toBe('IN_TRANSIT');

    await fleetService.updateTruckStatus('truck-caranqui-2', 'IDLE');
    trucks = await fleetService.getFleetStatus();
    truck = trucks.find((t) => t.id === 'truck-caranqui-2');
    expect(truck?.status).toBe('IDLE');
  });

  it('POST /api/v1/trucks/telemetry should update coordinates in fleetService', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-caranqui-2',
        latitude: 0.3399,
        longitude: -78.1399,
        currentStock: 30,
      },
    });

    expect(response.statusCode).toBe(200);
    const trucks = await fleetService.getFleetStatus();
    const updated = trucks.find((t) => t.id === 'truck-caranqui-2');
    expect(updated?.lastLatitude).toBe(0.3399);
    expect(updated?.lastLongitude).toBe(-78.1399);
  });

  it('POST /api/v1/fleet/trucks/:id/status should update truck status and return 200', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/fleet/trucks/truck-caranqui-2/status',
      payload: {
        status: 'IN_TRANSIT',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);

    const trucks = await fleetService.getFleetStatus();
    const updated = trucks.find((t) => t.id === 'truck-caranqui-2');
    expect(updated?.status).toBe('IN_TRANSIT');
  });
});
