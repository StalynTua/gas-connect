import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conversationService } from './conversation.service.js';
import { evolutionClient } from './evolution.client.js';

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

export async function whatsappRoutes(server: FastifyInstance) {
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
   *
   * Flujo real de Evolution API v2:
   *   1. El cliente llama aquí → el backend llama a /instance/connect en Evolution.
   *   2. Evolution inicia el socket Baileys en background y emite QRCODE_UPDATED
   *      al webhook configurado (POST /api/v1/whatsapp/webhook).
   *   3. El webhook handler almacena el QR en memoria (evolutionClient.cacheQr).
   *   4. El polling del frontend sigue llamando aquí hasta que el caché tiene el QR.
   */
  server.get(
    '/api/v1/whatsapp/qr',
    async (
      request: FastifyRequest<{ Querystring: { number?: string; force?: string } }>,
      reply: FastifyReply
    ) => {
      const phoneNumber = request.query.number;
      const force = request.query.force === 'true';

      // Verificar estado de la instancia antes de pedir el QR
      const connectionState = await evolutionClient.getConnectionState();

      // Si ya está conectada (open) y no se solicita forzar regeneración, responder 409
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

      // 1. Intentar servir el QR desde el caché (llega vía evento QRCODE_UPDATED)
      const cached = evolutionClient.getCachedQr();
      if (cached) {
        return reply.status(200).send({
          instanceName: evolutionClient.getInstanceName(),
          ...cached,
        });
      }

      // 2. Sin caché: llamar a /instance/connect para que Evolution inicie el socket
      //    y emita el evento QRCODE_UPDATED al webhook. Responder 202 para que el
      //    cliente siga polleando mientras llega el evento.
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
   * Maneja tanto eventos de sistema (QRCODE_UPDATED, CONNECTION_UPDATE)
   * como eventos de mensajes entrantes.
   */
  server.post(
    '/api/v1/whatsapp/webhook',
    async (request: FastifyRequest<{ Body: EvolutionWebhookBody }>, reply: FastifyReply) => {
      const body = request.body;

      if (!body || !body.event) {
        return reply.status(200).send({ status: 'ignored' });
      }

      // ── Eventos de sistema ───────────────────────────────────────────────────

      if (body.event === 'QRCODE_UPDATED') {
        // Evolution API v2 entrega el QR vía webhook, no en la respuesta HTTP de
        // /instance/connect. Lo almacenamos en memoria para que GET /qr lo sirva.
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
          // La instancia se conectó exitosamente: el QR ya no es necesario
          evolutionClient.clearQrCache();
          server.log.info(
            { event: 'CONNECTION_UPDATE', state },
            'WhatsApp connected, QR cache cleared'
          );
        }
        return reply.status(200).send({ status: 'connection_update_handled' });
      }

      // ── Eventos de mensaje ───────────────────────────────────────────────────
      // Ignorar mensajes enviados por nosotros mismos o eventos sin payload de mensaje
      if (!body.data || !body.data.key || body.data.key.fromMe) {
        return reply.status(200).send({ status: 'ignored' });
      }

      // Extraer número de teléfono real del cliente.
      // En WhatsApp moderno, data.key.remoteJid puede ser un identificador interno (@lid),
      // mientras que el número de teléfono real (@s.whatsapp.net) viene en body.sender.
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

      const result = await conversationService.processInboundMessage({
        from: phoneNumber,
        text,
        buttonId,
        location,
      });

      return reply.status(200).send({ status: 'processed', result });
    }
  );
}
