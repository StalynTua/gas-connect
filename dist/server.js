"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const orders_controller_js_1 = require("./modules/orders/orders.controller.js");
const webhook_controller_js_1 = require("./modules/whatsapp/webhook.controller.js");
const fleet_controller_js_1 = require("./modules/fleet/fleet.controller.js");
const evolution_client_js_1 = require("./modules/whatsapp/evolution.client.js");
dotenv_1.default.config();
function buildServer() {
    const server = (0, fastify_1.default)({
        logger: {
            level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
            transport: process.env.NODE_ENV === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname',
                    },
                }
                : undefined,
        },
    });
    server.register(cors_1.default, {
        origin: '*',
    });
    server.register(helmet_1.default, {
        contentSecurityPolicy: false,
    });
    // Healthcheck endpoint
    server.get('/api/health', async () => {
        return {
            status: 'ok',
            service: 'gasconnect-ibarra-api',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });
    // Rutas de pedidos, decisiones de cabina y telemetría
    server.register(orders_controller_js_1.ordersRoutes);
    // Rutas de webhook de WhatsApp (Evolution API)
    server.register(webhook_controller_js_1.whatsappRoutes);
    // Rutas de monitoreo de flota (Ops Portal)
    server.register(fleet_controller_js_1.fleetRoutes);
    return server;
}
async function start() {
    const server = buildServer();
    const port = Number(process.env.PORT) || 8000;
    const host = process.env.HOST || '0.0.0.0';
    try {
        await server.listen({ port, host });
        console.log(`🚀 GasConnect Ibarra API corriendo en http://${host}:${port}`);
        // Auto-configurar Evolution API en segundo plano
        evolution_client_js_1.evolutionClient
            .ensureConfigured()
            .then((status) => {
            console.log(`📱 Evolution API WhatsApp configurado. Instancia: "${status.instanceName}", Estado: "${status.state}"`);
        })
            .catch((err) => {
            console.warn(`⚠️ No se pudo auto-configurar Evolution API en el arranque:`, err.message);
        });
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
// Start only if executed directly
if (process.env.NODE_ENV !== 'test') {
    start();
}
//# sourceMappingURL=server.js.map