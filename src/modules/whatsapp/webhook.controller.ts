import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { conversationService } from './conversation.service.js';
import { evolutionClient } from './evolution.client.js';

interface EvolutionWebhookBody {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
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
   * Obtiene el código QR o código de emparejamiento para conectar WhatsApp
   */
  server.get(
    '/api/v1/whatsapp/qr',
    async (request: FastifyRequest<{ Querystring: { number?: string } }>, reply: FastifyReply) => {
      const phoneNumber = request.query.number;

      // Verificar estado de la instancia antes de pedir el QR
      const connectionState = await evolutionClient.getConnectionState();

      // Si ya está conectada (open), no tiene sentido pedir QR
      if (connectionState.state === 'open' && connectionState.connected) {
        return reply.status(409).send({
          error: 'already_connected',
          message: 'La instancia ya está conectada. No se requiere QR.',
        });
      }

      const qrData = await evolutionClient.getQrCode(phoneNumber);

      // La instancia existe pero el socket Baileys aún está iniciando
      // (state = 'connecting'): el QR todavía no está disponible.
      // Responder 202 para que el cliente siga polleando sin tratarlo como error.
      if (!qrData || (!qrData.base64 && !qrData.pairingCode)) {
        return reply.status(202).send({
          generating: true,
          state: connectionState.state,
          message: 'El código QR se está generando. Reintenta en unos segundos.',
        });
      }

      return reply.status(200).send({
        instanceName: evolutionClient.getInstanceName(),
        ...qrData,
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
   * Webhook principal de Evolution API
   */
  server.post(
    '/api/v1/whatsapp/webhook',
    async (request: FastifyRequest<{ Body: EvolutionWebhookBody }>, reply: FastifyReply) => {
      const body = request.body;

      // Ignorar mensajes enviados por nosotros mismos o eventos no relevantes
      if (!body || !body.data || !body.data.key || body.data.key.fromMe) {
        return reply.status(200).send({ status: 'ignored' });
      }

      const remoteJid = body.data.key.remoteJid;
      // Extraer número de teléfono limpio sin sufijo @s.whatsapp.net
      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');

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

