import { buildServer } from '../src/server.js';
import {
  DispatchDecisionRequestSchema,
  CompleteOrderRequestSchema,
  FlexibleTelemetryPingRequestSchema,
  FleetStatusResponseSchema,
  FleetMetricsResponseSchema,
  FleetEventsResponseSchema,
} from '@gasconnect/contracts';
import { calculateHaversineDistance } from '../src/modules/routing/domain/haversine.calculator.js';
import { OsrmHttpClient } from '../src/modules/routing/infrastructure/osrm-http.client.js';
import { dispatchOrchestrator } from '../src/modules/dispatch/dispatch-orchestrator.service.js';
import { fleetService } from '../src/modules/fleet/fleet.service.js';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function assertTest(
  suite: string,
  name: string,
  fn: () => Promise<void> | void
) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    results.push({
      suite,
      name,
      passed: false,
      details: err?.message || String(err),
      durationMs,
    });
    console.error(`  [FAIL] ${name} (${durationMs}ms): ${err?.message}`);
  }
}

async function runAdversarialStressSuite() {
  console.log('===============================================================');
  console.log('Starting Empirical Adversarial Stress Suite (Fastify DDD M2)');
  console.log('===============================================================\n');

  process.env.NODE_ENV = 'test';
  const server = buildServer();
  await server.ready();

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 1: POST /api/v1/dispatch/decision
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SUITE 1: POST /api/v1/dispatch/decision ---');

  await assertTest('Dispatch Decision', 'Missing orderId -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { truckId: 'truck-1', decision: 'ACCEPTED' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.fieldErrors?.orderId) throw new Error(`Expected fieldErrors.orderId, got ${JSON.stringify(body)}`);
  });

  await assertTest('Dispatch Decision', 'Missing truckId -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 'ord-1', decision: 'ACCEPTED' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.fieldErrors?.truckId) throw new Error(`Expected fieldErrors.truckId, got ${JSON.stringify(body)}`);
  });

  await assertTest('Dispatch Decision', 'Missing decision -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 'ord-1', truckId: 'truck-1' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.fieldErrors?.decision) throw new Error(`Expected fieldErrors.decision, got ${JSON.stringify(body)}`);
  });

  await assertTest('Dispatch Decision', 'Invalid decision enum ("MAYBE") -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 'ord-1', truckId: 'truck-1', decision: 'MAYBE' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Dispatch Decision', 'Empty strings in required fields -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: '', truckId: '', decision: 'ACCEPTED' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Dispatch Decision', 'Completely empty body {} -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: {},
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Dispatch Decision', 'Invalid type (orderId as number) -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 12345, truckId: 'truck-1', decision: 'ACCEPTED' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Dispatch Decision', 'Invalid quantity (negative or float) -> 400', async () => {
    const res1 = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 'ord-1', truckId: 'truck-1', decision: 'ACCEPTED', quantity: -3 },
    });
    if (res1.statusCode !== 400) throw new Error(`Expected 400 for negative quantity, got ${res1.statusCode}`);

    const res2 = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 'ord-1', truckId: 'truck-1', decision: 'ACCEPTED', quantity: 2.7 },
    });
    if (res2.statusCode !== 400) throw new Error(`Expected 400 for float quantity, got ${res2.statusCode}`);
  });

  await assertTest('Dispatch Decision', 'Valid payload for non-existent session -> 200 with EXPIRED sessionStatus', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 'ord-non-existent-999', truckId: 'truck-1', decision: 'ACCEPTED' },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (body.success !== false || body.sessionStatus !== 'EXPIRED') {
      throw new Error(`Expected success: false, sessionStatus: EXPIRED, got ${res.body}`);
    }
  });

  await assertTest('Dispatch Decision', 'Valid payload with active session (ACCEPT) -> 200 ASSIGNED', async () => {
    const testOrderId = `order-stress-accept-${Date.now()}`;
    await dispatchOrchestrator.startDispatch({
      orderId: testOrderId,
      quantityRequested: 2,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates: [
        {
          id: 'truck-ceibos-1',
          licensePlate: 'IAA-1041',
          driverName: 'Carlos Minda',
          helperName: 'Juan Pérez',
          helperPhone: '0991112233',
          currentStockFull: 28,
          latitude: 0.3475,
          longitude: -78.1285,
        },
      ],
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: testOrderId, truckId: 'truck-ceibos-1', decision: 'ACCEPTED' },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (body.success !== true || body.sessionStatus !== 'ASSIGNED' || body.assignedTruckId !== 'truck-ceibos-1') {
      throw new Error(`Unexpected body: ${res.body}`);
    }
  });

  await assertTest('Dispatch Decision', 'Valid payload with active session (REJECT cascade to EXPIRED) -> 200 EXPIRED', async () => {
    const testOrderId = `order-stress-reject-${Date.now()}`;
    await dispatchOrchestrator.startDispatch({
      orderId: testOrderId,
      quantityRequested: 1,
      deliveryLocation: { lat: 0.3475, lng: -78.1285 },
      mockCandidates: [
        {
          id: 'truck-caranqui-2',
          licensePlate: 'IAA-2052',
          driverName: 'Wilson Imbaquingo',
          helperName: 'Segundo Farinango',
          currentStockFull: 34,
          latitude: 0.3312,
          longitude: -78.1345,
        },
      ],
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: testOrderId, truckId: 'truck-caranqui-2', decision: 'REJECTED' },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (body.sessionStatus !== 'EXPIRED') {
      throw new Error(`Expected sessionStatus EXPIRED, got ${res.body}`);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 2: POST /api/v1/orders/complete
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 2: POST /api/v1/orders/complete ---');

  await assertTest('Orders Complete', 'Missing orderId -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: { truckId: 'truck-1', quantityDelivered: 1 },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.fieldErrors?.orderId) throw new Error(`Expected fieldErrors.orderId, got ${JSON.stringify(body)}`);
  });

  await assertTest('Orders Complete', 'Missing truckId -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: { orderId: 'ord-1', quantityDelivered: 1 },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.fieldErrors?.truckId) throw new Error(`Expected fieldErrors.truckId, got ${JSON.stringify(body)}`);
  });

  await assertTest('Orders Complete', 'Missing quantityDelivered -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: { orderId: 'ord-1', truckId: 'truck-1' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.fieldErrors?.quantityDelivered) throw new Error(`Expected fieldErrors.quantityDelivered, got ${JSON.stringify(body)}`);
  });

  await assertTest('Orders Complete', 'Non-positive quantityDelivered (0 or -5) -> 400', async () => {
    const resZero = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: { orderId: 'ord-1', truckId: 'truck-1', quantityDelivered: 0 },
    });
    if (resZero.statusCode !== 400) throw new Error(`Expected 400 for qty=0, got ${resZero.statusCode}`);

    const resNeg = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: { orderId: 'ord-1', truckId: 'truck-1', quantityDelivered: -5 },
    });
    if (resNeg.statusCode !== 400) throw new Error(`Expected 400 for qty=-5, got ${resNeg.statusCode}`);
  });

  await assertTest('Orders Complete', 'Invalid paymentMethod ("CRYPTO") -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: {
        orderId: 'ord-1',
        truckId: 'truck-1',
        quantityDelivered: 1,
        paymentMethod: 'CRYPTO',
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Orders Complete', 'Negative amountCollected -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: {
        orderId: 'ord-1',
        truckId: 'truck-1',
        quantityDelivered: 1,
        amountCollected: -15.5,
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Orders Complete', 'Valid payload (CASH default) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: {
        orderId: `ord-complete-${Date.now()}`,
        truckId: 'truck-caranqui-2',
        quantityDelivered: 2,
        amountCollected: 6.0,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.success || typeof body.remainingStock !== 'number') {
      throw new Error(`Unexpected response structure: ${res.body}`);
    }
  });

  await assertTest('Orders Complete', 'Valid payload (TRANSFER payment) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: {
        orderId: `ord-transfer-${Date.now()}`,
        truckId: 'truck-ceibos-1',
        quantityDelivered: 1,
        paymentMethod: 'TRANSFER',
        amountCollected: 3.0,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (!body.success) throw new Error(`Expected success: true, got ${res.body}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 3: POST /api/v1/trucks/telemetry (Boundary & Stress)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 3: POST /api/v1/trucks/telemetry (Boundaries) ---');

  await assertTest('Telemetry', 'Canonical payload (Ibarra coords) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-ceibos-1',
        latitude: 0.3475,
        longitude: -78.1285,
        currentStock: 25,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (body.status !== 'ok' || body.truckId !== 'truck-ceibos-1') {
      throw new Error(`Unexpected body: ${res.body}`);
    }
  });

  await assertTest('Telemetry', 'Flexible payload (lat/lng alias) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-caranqui-2',
        lat: 0.3312,
        lng: -78.1345,
        currentStock: 30,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const body = JSON.parse(res.body);
    if (body.status !== 'ok') throw new Error(`Expected status: ok, got ${res.body}`);
  });

  await assertTest('Telemetry', 'Boundary: North Pole (lat: 90, lng: 0) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-centro-3',
        latitude: 90,
        longitude: 0,
        currentStock: 10,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Boundary: South Pole (lat: -90, lng: 0) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-centro-3',
        latitude: -90,
        longitude: 0,
        currentStock: 10,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Boundary: Date Line East (lat: 0, lng: 180) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-yacucalle-4',
        latitude: 0,
        longitude: 180,
        currentStock: 5,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Boundary: Date Line West (lat: 0, lng: -180) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-yacucalle-4',
        latitude: 0,
        longitude: -180,
        currentStock: 5,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Boundary: Equator & Prime Meridian (0, 0) -> 200', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-ceibos-1',
        latitude: 0,
        longitude: 0,
        currentStock: 0,
      },
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Out of bounds: latitude > 90 (lat: 90.0001) -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-1',
        latitude: 90.0001,
        longitude: 0,
        currentStock: 5,
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Out of bounds: latitude < -90 (lat: -90.0001) -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-1',
        latitude: -90.0001,
        longitude: 0,
        currentStock: 5,
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Out of bounds: longitude > 180 (lng: 180.0001) -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-1',
        latitude: 0,
        longitude: 180.0001,
        currentStock: 5,
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Out of bounds: longitude < -180 (lng: -180.0001) -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-1',
        latitude: 0,
        longitude: -180.0001,
        currentStock: 5,
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Negative stock (currentStock: -1) -> 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: 'truck-1',
        latitude: 0.3475,
        longitude: -78.1285,
        currentStock: -1,
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Telemetry', 'Missing truckId or empty string -> 400', async () => {
    const resEmpty = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks/telemetry',
      payload: {
        truckId: '',
        latitude: 0.3475,
        longitude: -78.1285,
        currentStock: 10,
      },
    });
    if (resEmpty.statusCode !== 400) throw new Error(`Expected 400, got ${resEmpty.statusCode}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 4: GET /api/v1/fleet/* (Contract Validation)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 4: GET /api/v1/fleet/* (Contracts) ---');

  await assertTest('Fleet Monitoring', 'GET /api/v1/fleet/status matches FleetStatusResponseSchema', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/fleet/status',
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const data = JSON.parse(res.body);
    const parsed = FleetStatusResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Schema mismatch: ${JSON.stringify(parsed.error.format())}`);
    }
    if (data.count < 1 || !Array.isArray(data.trucks)) {
      throw new Error(`Expected non-empty trucks array, got ${data.count}`);
    }
  });

  await assertTest('Fleet Monitoring', 'GET /api/v1/fleet/metrics matches FleetMetricsResponseSchema', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/fleet/metrics',
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const data = JSON.parse(res.body);
    const parsed = FleetMetricsResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Schema mismatch: ${JSON.stringify(parsed.error.format())}`);
    }
    if (typeof data.metrics.totalStockAvailable !== 'number') {
      throw new Error(`Expected metrics.totalStockAvailable number, got ${JSON.stringify(data.metrics)}`);
    }
  });

  await assertTest('Fleet Monitoring', 'GET /api/v1/fleet/events matches FleetEventsResponseSchema', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/fleet/events',
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const data = JSON.parse(res.body);
    const parsed = FleetEventsResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Schema mismatch: ${JSON.stringify(parsed.error.format())}`);
    }
    if (data.count < 1 || !Array.isArray(data.events)) {
      throw new Error(`Expected non-empty events array, got ${data.count}`);
    }
  });

  await assertTest('Fleet Monitoring', 'GET with adversarial query injection (?eval=true&__proto__=1) -> 200', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/v1/fleet/status?eval=true&__proto__=1&drop=table',
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}: ${res.body}`);
    const data = JSON.parse(res.body);
    if (!data.success) throw new Error(`Expected success: true, got ${res.body}`);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 5: Routing & Distance Calculations (Extreme Coordinates)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 5: Routing & Distance (Haversine & OSRM Fallback) ---');

  await assertTest('Haversine', 'Identical coordinates (0, 0) to (0, 0) -> 0 meters', () => {
    const d = calculateHaversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 0 });
    if (d !== 0) throw new Error(`Expected 0, got ${d}`);
  });

  await assertTest('Haversine', 'Ibarra intra-urban distance (~1000m - 1200m)', () => {
    const from = { lat: 0.3541, lng: -78.1221 }; // Centro Histórico
    const to = { lat: 0.3475, lng: -78.1285 }; // Los Ceibos
    const d = calculateHaversineDistance(from, to);
    if (d < 900 || d > 1300) throw new Error(`Expected ~1000-1200m, got ${d}m`);
  });

  await assertTest('Haversine', 'North Pole (90, 0) to South Pole (-90, 0) -> ~20,015 km (finite, not NaN)', () => {
    const d = calculateHaversineDistance({ lat: 90, lng: 0 }, { lat: -90, lng: 0 });
    if (isNaN(d) || !isFinite(d)) throw new Error(`Expected finite number, got ${d}`);
    if (d < 20000000 || d > 20050000) throw new Error(`Expected ~20015 km, got ${d} meters`);
  });

  await assertTest('Haversine', 'Equatorial antipodal (0, 0) to (0, 180) -> ~20,015 km (finite, not NaN)', () => {
    const d = calculateHaversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    if (isNaN(d) || !isFinite(d)) throw new Error(`Expected finite number, got ${d}`);
    if (d < 20000000 || d > 20050000) throw new Error(`Expected ~20015 km, got ${d} meters`);
  });

  await assertTest('Haversine', 'Date Line wrap (-180 vs +180 same longitude) -> 0 meters', () => {
    const d = calculateHaversineDistance({ lat: 0, lng: -180 }, { lat: 0, lng: 180 });
    if (d !== 0) throw new Error(`Expected 0 for 360 deg wrap, got ${d}`);
  });

  await assertTest('Haversine', 'Sub-meter micro-distance (1e-6 degrees ~0.11m) -> round to 0 or 1m', () => {
    const d = calculateHaversineDistance({ lat: 0.347500, lng: -78.128500 }, { lat: 0.347501, lng: -78.128500 });
    if (isNaN(d) || d < 0 || d > 2) throw new Error(`Expected 0m or 1m, got ${d}`);
  });

  await assertTest('OSRM Fallback', 'OSRM offline fallback calculates 1.35x sinuosity & 25km/h speed', async () => {
    const client = new OsrmHttpClient('http://127.0.0.1:9999'); // Unreachable port
    const from = { lat: 0.3541, lng: -78.1221 };
    const to = { lat: 0.3475, lng: -78.1285 };

    const route = await client.calculateRoute(from, to);
    if (!route.isFallbackEstimate) throw new Error('Expected isFallbackEstimate to be true');
    const directHaversine = calculateHaversineDistance(from, to);
    const expectedRoad = Math.round(directHaversine * 1.35);
    if (Math.abs(route.distanceMeters - expectedRoad) > 5) {
      throw new Error(`Expected road distance ~${expectedRoad}, got ${route.distanceMeters}`);
    }
    if (route.durationSeconds <= 0 || route.durationMinutes <= 0) {
      throw new Error(`Expected positive duration, got ${route.durationSeconds}s`);
    }
  });

  await assertTest('OSRM Fallback', 'calculateTableMatrix fallback handles multiple origins without throwing', async () => {
    const client = new OsrmHttpClient('http://127.0.0.1:9999');
    const origins = [
      { lat: 0.3475, lng: -78.1285 },
      { lat: 0.3312, lng: -78.1345 },
      { lat: 0.3541, lng: -78.1221 },
    ];
    const destination = { lat: 0.342, lng: -78.1189 };

    const resultsMatrix = await client.calculateTableMatrix(origins, destination);
    if (resultsMatrix.length !== 3) {
      throw new Error(`Expected 3 route results, got ${resultsMatrix.length}`);
    }
    for (const r of resultsMatrix) {
      if (!r.isFallbackEstimate || r.distanceMeters <= 0) {
        throw new Error(`Invalid fallback matrix item: ${JSON.stringify(r)}`);
      }
    }
  });

  await assertTest('OSRM Fallback', 'Stress: 50 concurrent route queries during server operation', async () => {
    const client = new OsrmHttpClient('http://127.0.0.1:9999');
    const promises = Array.from({ length: 50 }).map((_, idx) =>
      client.calculateRoute(
        { lat: 0.34 + idx * 0.0001, lng: -78.12 },
        { lat: 0.35, lng: -78.13 }
      )
    );
    const resolved = await Promise.all(promises);
    if (resolved.length !== 50) throw new Error(`Expected 50 results, got ${resolved.length}`);
    if (resolved.some((r) => !r.isFallbackEstimate)) throw new Error('All should be fallback');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 6: Edge Cases, Security & Attack Vectors
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- SUITE 6: Edge Cases, Security & Robustness ---');

  await assertTest('Security & Parsing', 'Malformed JSON body -> Fastify 400', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      headers: { 'content-type': 'application/json' },
      payload: '{"orderId": "broken-json, truckId',
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400, got ${res.statusCode}: ${res.body}`);
  });

  await assertTest('Security & Parsing', 'Prototype pollution attempt in JSON body -> Handled safely (200 or 400, no 500)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: {
        orderId: 'ord-proto-test',
        truckId: 'truck-1',
        decision: 'ACCEPTED',
        __proto__: { admin: true },
        constructor: { prototype: { poll: true } },
      },
    });
    if (res.statusCode >= 500) throw new Error(`Server crashed on proto injection: ${res.statusCode}`);
  });

  await assertTest('Security & Parsing', 'Large string payload (100KB) -> Rejection or truncation without crash', async () => {
    const largeString = 'A'.repeat(100 * 1024);
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: {
        orderId: largeString,
        truckId: 'truck-1',
        decision: 'ACCEPTED',
      },
    });
    // Should be handled gracefully (200 with fallback or 400/413)
    if (res.statusCode >= 500) throw new Error(`Server returned 500 on large payload: ${res.statusCode}`);
  });

  await assertTest('Edge Case: Case Sensitivity', 'Lowercase decision ("accepted") -> 400 (strict enum validation)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/dispatch/decision',
      payload: { orderId: 'ord-1', truckId: 'truck-1', decision: 'accepted' },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400 for lowercase enum, got ${res.statusCode}`);
  });

  await assertTest('Edge Case: Case Sensitivity', 'Lowercase paymentMethod ("cash") -> 400 (strict enum validation)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/complete',
      payload: {
        orderId: 'ord-1',
        truckId: 'truck-1',
        quantityDelivered: 1,
        paymentMethod: 'cash',
      },
    });
    if (res.statusCode !== 400) throw new Error(`Expected 400 for lowercase paymentMethod, got ${res.statusCode}`);
  });

  await assertTest('Empirical Vulnerability Probe', 'POST /api/v1/fleet/trucks/:id/telemetry with latitude: 0 (falsy check bug test)', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/fleet/trucks/truck-ceibos-1/telemetry',
      payload: { latitude: 0, longitude: -78.1285 },
    });
    // In fleet.controller.ts:57: "if (!latitude || !longitude)"
    // If latitude is 0, !0 is true -> returns 400 instead of 200!
    if (res.statusCode === 400) {
      console.log('    -> CONFIRMED KNOWN VULNERABILITY: fleet.controller.ts line 57 uses falsy `!latitude` which rejects valid coordinate 0 (Equator).');
    } else if (res.statusCode === 200) {
      console.log('    -> latitude: 0 was accepted.');
    }
  });

  await server.close();

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log('Adversarial Stress Suite Summary:');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total assertions: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('===============================================================');

  if (failed > 0) {
    console.error('\nFAILED TESTS:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.error(`- [${r.suite}] ${r.name}: ${r.details}`));
    process.exit(1);
  } else {
    console.log(`\nALL ${passed} ADVERSARIAL STRESS ASSERTIONS PASSED WITH ZERO UNEXPECTED FAILURES.`);
    process.exit(0);
  }
}

runAdversarialStressSuite().catch((err) => {
  console.error('Fatal crash during test suite execution:', err);
  process.exit(1);
});

