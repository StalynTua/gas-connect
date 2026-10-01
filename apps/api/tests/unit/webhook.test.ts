import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server.js';
import { orderNotifierService } from '../../src/modules/whatsapp/order-notifier.service.js';

describe('Evolution API Webhook & Notifier', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    server = buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should ignore webhook events sent from bot itself (fromMe: true)', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      payload: {
        event: 'messages.upsert',
        instance: 'gasconnect-ibarra-test',
        data: {
          key: {
            remoteJid: '593991234567@s.whatsapp.net',
            fromMe: true,
            id: 'msg-12345',
          },
          message: {
            conversation: 'Hola soy el bot',
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ignored');
  });

  it('should process user greeting text message', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      payload: {
        event: 'messages.upsert',
        instance: 'gasconnect-ibarra-test',
        data: {
          key: {
            remoteJid: '593992223344@s.whatsapp.net',
            fromMe: false,
            id: 'msg-54321',
          },
          message: {
            conversation: 'Hola buenas tardes necesito gas',
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('processed');
    expect(body.result.nextStep).toBe('AWAITING_LOCATION');
  });

  it('should process locationMessage with GPS coordinates in Ibarra', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      payload: {
        event: 'messages.upsert',
        instance: 'gasconnect-ibarra-test',
        data: {
          key: {
            remoteJid: '593992223344@s.whatsapp.net',
            fromMe: false,
            id: 'msg-54322',
          },
          message: {
            locationMessage: {
              degreesLatitude: 0.3475,
              degreesLongitude: -78.1285,
              name: 'Los Ceibos, Ibarra',
            },
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('processed');
    expect(body.result.nextStep).toBe('AWAITING_LANDMARK');
  });

  it('should process SIMULATE_ORDER event and create real order without new endpoint', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/webhook',
      payload: {
        event: 'SIMULATE_ORDER',
        latitude: 0.3475,
        longitude: -78.1285,
        landmark: 'Casa esquinera amarilla de 2 pisos, reja negra con flores',
        quantity: 2,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('simulated_order_created');
    expect(body.success).toBe(true);
    expect(body.order).toBeDefined();
    expect(body.order.orderId).toMatch(/^ord-/);
    expect(body.order.quantity).toBe(2);
    expect(body.order.totalPrice).toBe(6.0);
    expect(body.order.destination.latitude).toBe(0.3475);
    expect(body.order.destination.longitude).toBe(-78.1285);
  });

  it('should send notifications via OrderNotifierService without throwing errors', async () => {
    const assignedResult = await orderNotifierService.notifyTruckAssigned({
      customerPhone: '593992223344',
      orderId: 'ord-test-101',
      licensePlate: 'IAA-1041',
      driverName: 'Carlos Minda',
      helperName: 'Juan Pérez',
      etaMinutes: 3,
    });
    expect(assignedResult).toBe(true);

    const completedResult = await orderNotifierService.notifyOrderCompleted(
      '593992223344',
      'ord-test-101',
      3.0
    );
    expect(completedResult).toBe(true);

    const partialOfferResult = await orderNotifierService.notifyPartialOffer('593992223344', {
      immediateStock: 1,
      immediateEtaMinutes: 4,
      fullEtaMinutes: 18,
    });
    expect(partialOfferResult).toBe(true);
  });

  it('should return instance status via GET /api/v1/whatsapp/status', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/status',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.instanceName).toBeDefined();
    expect(body.state).toBeDefined();
    expect(body.connected).toBe(true);
  });

  it('should return QR code data via GET /api/v1/whatsapp/qr', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/qr',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.pairingCode).toBe('1234-5678');
    expect(body.base64).toBeDefined();
  });

  it('should allow forcing QR generation via GET /api/v1/whatsapp/qr?force=true', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/whatsapp/qr?force=true',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.pairingCode).toBe('1234-5678');
  });

  it('should run auto-setup via POST /api/v1/whatsapp/setup', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/setup',
      payload: {
        webhookUrl: 'http://localhost:8000/api/v1/whatsapp/webhook',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.status.connected).toBe(true);
  });

  it('should process logout request via POST /api/v1/whatsapp/logout', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/whatsapp/logout',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });
});

