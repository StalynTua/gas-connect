"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappRoutes = whatsappRoutes;
const conversation_service_js_1 = require("./conversation.service.js");
const evolution_client_js_1 = require("./evolution.client.js");
async function whatsappRoutes(server) {
    /**
     * Consulta el estado actual de la instancia WhatsApp y conexión de Evolution API
     */
    server.get('/api/v1/whatsapp/status', async (_request, reply) => {
        const connection = await evolution_client_js_1.evolutionClient.getConnectionState();
        return reply.status(200).send({
            baseUrl: evolution_client_js_1.evolutionClient.getBaseUrl(),
            ...connection,
        });
    });
    /**
     * Obtiene el código QR o código de emparejamiento para conectar WhatsApp
     */
    server.get('/api/v1/whatsapp/qr', async (request, reply) => {
        const phoneNumber = request.query.number;
        const qrData = await evolution_client_js_1.evolutionClient.getQrCode(phoneNumber);
        if (!qrData) {
            return reply.status(404).send({
                error: 'qr_not_available',
                message: 'No se pudo generar el código QR. Verifica que Evolution API esté activo.',
            });
        }
        console.log(qrData, 'QRDATA');
        return reply.status(200).send({
            instanceName: evolution_client_js_1.evolutionClient.getInstanceName(),
            ...qrData,
        });
    });
    /**
     * Auto-configura la instancia y el webhook en Evolution API
     */
    server.post('/api/v1/whatsapp/setup', async (request, reply) => {
        const webhookUrl = request.body?.webhookUrl;
        const status = await evolution_client_js_1.evolutionClient.ensureConfigured(webhookUrl);
        return reply.status(200).send({
            success: true,
            message: 'Instancia de WhatsApp y Webhooks configurados con éxito en Evolution API.',
            status,
        });
    });
    /**
     * Desconecta/cierra la sesión actual de WhatsApp en Evolution API
     */
    server.post('/api/v1/whatsapp/logout', async (_request, reply) => {
        const success = await evolution_client_js_1.evolutionClient.logoutInstance();
        return reply.status(200).send({
            success,
            message: success ? 'Sesión de WhatsApp cerrada' : 'Error al cerrar sesión',
        });
    });
    /**
     * Webhook principal de Evolution API
     */
    server.post('/api/v1/whatsapp/webhook', async (request, reply) => {
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
        const result = await conversation_service_js_1.conversationService.processInboundMessage({
            from: phoneNumber,
            text,
            buttonId,
            location,
        });
        return reply.status(200).send({ status: 'processed', result });
    });
}
//# sourceMappingURL=webhook.controller.js.map