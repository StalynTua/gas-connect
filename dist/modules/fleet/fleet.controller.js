"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fleetRoutes = fleetRoutes;
const fleet_service_js_1 = require("./fleet.service.js");
async function fleetRoutes(server) {
    /**
     * Obtener estado en tiempo real de todos los camiones
     */
    server.get('/api/v1/fleet/status', async (_request, reply) => {
        const trucks = await fleet_service_js_1.fleetService.getFleetStatus();
        return reply.status(200).send({
            success: true,
            count: trucks.length,
            trucks,
        });
    });
    /**
     * Obtener resumen de métricas del día (pedidos, ventas, alertas de stock)
     */
    server.get('/api/v1/fleet/metrics', async (_request, reply) => {
        const metrics = await fleet_service_js_1.fleetService.getDashboardMetrics();
        return reply.status(200).send({
            success: true,
            metrics,
        });
    });
    /**
     * Obtener feed de eventos de actividad en tiempo real desde la BD
     */
    server.get('/api/v1/fleet/events', async (_request, reply) => {
        const events = await fleet_service_js_1.fleetService.getActivityEvents();
        return reply.status(200).send({
            success: true,
            count: events.length,
            events,
        });
    });
    /**
     * Actualizar posición de un camión específico
     */
    server.post('/api/v1/fleet/trucks/:id/telemetry', async (request, reply) => {
        const { id } = request.params;
        const { latitude, longitude } = request.body;
        if (!latitude || !longitude) {
            return reply.status(400).send({
                success: false,
                error: 'latitude and longitude are required',
            });
        }
        await fleet_service_js_1.fleetService.updateTruckPosition(id, latitude, longitude);
        return reply.status(200).send({
            success: true,
            message: 'Telemetry updated',
        });
    });
}
//# sourceMappingURL=fleet.controller.js.map