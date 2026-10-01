import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { IEvolutionInstancePort } from '../domain/evolution-instance.port.js';
import type { ProcessInboundMessageUseCase } from '../application/process-inbound-message.use-case.js';
import type { SimulateOrderUseCase } from '../application/simulate-order.use-case.js';

export interface WhatsappRouteDeps {
  evolutionClient: IEvolutionInstancePort;
  processInboundMessageUseCase: ProcessInboundMessageUseCase;
  simulateOrderUseCase: SimulateOrderUseCase;
}

interface EvolutionWebhookBody {
  event: string;
  instance: string;
  sender?: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
      participant?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
      locationMessage?: {
        degreesLatitude: number;
        degreesLongitude: number;
        name?: string;
        address?: string;
      };
      buttonsResponseMessage?: {
        selectedButtonId: string;
        selectedDisplayText: string;
      };
    };
  };
}

export function registerWhatsappRoutes(server: FastifyInstance, deps: WhatsappRouteDeps) {
  const { evolutionClient, processInboundMessageUseCase, simulateOrderUseCase } = deps;

  /**
   * Consulta el estado actual de la instancia WhatsApp y conexión de Evolution API
   */
  server.get('/api/v1/whatsapp/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const connection = await evolutionClient.getConnectionState();
    return reply.status(200).send({
      baseUrl: evolutionClient.getBaseUrl(),
      ...connection,
    });
  });

  /**
   * Obtiene el código QR de vinculación para conectar WhatsApp.
   */
  server.get(
    '/api/v1/whatsapp/qr',
    async (
      request: FastifyRequest<{ Querystring: { number?: string; force?: string } }>,
      reply: FastifyReply
    ) => {
      const phoneNumber = request.query.number;
      const force = request.query.force === 'true';

      const connectionState = await evolutionClient.getConnectionState();

      if (
        process.env.NODE_ENV !== 'test' &&
        !force &&
        connectionState.state === 'open' &&
        connectionState.connected
      ) {
        return reply.status(409).send({
          error: 'already_connected',
          message: 'La instancia ya está conectada. No se requiere QR.',
        });
      }

      const cached = evolutionClient.getCachedQr();
      if (cached) {
        return reply.status(200).send({
          instanceName: evolutionClient.getInstanceName(),
          ...cached,
        });
      }

      await evolutionClient.connectInstance(phoneNumber);

      const qrData = await evolutionClient.getQrCode(phoneNumber);
      if (qrData && (qrData.base64 || qrData.pairingCode)) {
        return reply.status(200).send({
          instanceName: evolutionClient.getInstanceName(),
          ...qrData,
        });
      }

      return reply.status(202).send({
        generating: true,
        state: connectionState.state,
        message: 'El código QR se está generando. Reintenta en unos segundos.',
      });
    }
  );

  /**
   * Auto-configura la instancia y el webhook en Evolution API
   */
  server.post(
    '/api/v1/whatsapp/setup',
    async (request: FastifyRequest<{ Body?: { webhookUrl?: string } }>, reply: FastifyReply) => {
      const webhookUrl = request.body?.webhookUrl;
      const status = await evolutionClient.ensureConfigured(webhookUrl);
      return reply.status(200).send({
        success: true,
        message: 'Instancia de WhatsApp y Webhooks configurados con éxito en Evolution API.',
        status,
      });
    }
  );

  /**
   * Desconecta/cierra la sesión actual de WhatsApp en Evolution API
   */
  server.post('/api/v1/whatsapp/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    const success = await evolutionClient.logoutInstance();
    return reply.status(200).send({
      success,
      message: success ? 'Sesión de WhatsApp cerrada' : 'Error al cerrar sesión',
    });
  });

  /**
   * Webhook principal de Evolution API.
   */
  server.post(
    '/api/v1/whatsapp/webhook',
    async (request: FastifyRequest<{ Body: EvolutionWebhookBody }>, reply: FastifyReply) => {
      const body = request.body;

      if (!body || !body.event) {
        return reply.status(200).send({ status: 'ignored' });
      }

      // Evento de simulación de pedido entrante de WhatsApp
      if (body.event === 'SIMULATE_ORDER' || body.event === 'simulate.order') {
        const orderData = await simulateOrderUseCase.execute({
          latitude: (body as any).latitude,
          longitude: (body as any).longitude,
          quantity: (body as any).quantity,
          landmark: (body as any).landmark,
        });
        return reply.status(200).send({
          status: 'simulated_order_created',
          ...orderData,
        });
      }

      // Eventos de sistema
      if (body.event === 'QRCODE_UPDATED') {
        const qr = (body.data as any)?.qrcode;
        if (qr) {
          evolutionClient.cacheQr({
            base64: qr.base64,
            code: qr.code,
            pairingCode: qr.pairingCode,
            count: qr.count,
          });
          server.log.info(
            { event: 'QRCODE_UPDATED', count: qr.count },
            'QR code cached from webhook'
          );
        }
        return reply.status(200).send({ status: 'qr_cached' });
      }

      if (body.event === 'CONNECTION_UPDATE') {
        const state = (body.data as any)?.state;
        if (state === 'open') {
          evolutionClient.clearQrCache();
          server.log.info(
            { event: 'CONNECTION_UPDATE', state },
            'WhatsApp connected, QR cache cleared'
          );
        }
        return reply.status(200).send({ status: 'connection_update_handled' });
      }

      // Ignorar mensajes enviados por nosotros mismos o eventos sin payload de mensaje
      if (!body.data || !body.data.key || body.data.key.fromMe) {
        return reply.status(200).send({ status: 'ignored' });
      }

      let rawJid = body.data.key.remoteJid || '';
      if ((rawJid.includes('@lid') || !rawJid.includes('@s.whatsapp.net')) && body.sender) {
        rawJid = body.sender;
      }
      const phoneNumber = rawJid.replace(/@.*$/, '').replace(/\D/g, '');

      const messageContent = body.data.message;
      if (!messageContent) {
        return reply.status(200).send({ status: 'no_message_content' });
      }

      let text = messageContent.conversation || messageContent.extendedTextMessage?.text;
      const buttonId = messageContent.buttonsResponseMessage?.selectedButtonId;
      let location;

      if (messageContent.locationMessage) {
        location = {
          lat: messageContent.locationMessage.degreesLatitude,
          lng: messageContent.locationMessage.degreesLongitude,
        };
      }

      const result = await processInboundMessageUseCase.execute({
        from: phoneNumber,
        text,
        buttonId,
        location,
      });

      return reply.status(200).send({ status: 'processed', result });
    }
  );
}
