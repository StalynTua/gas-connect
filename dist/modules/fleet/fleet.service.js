"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fleetService = exports.FleetService = void 0;
const prisma_js_1 = require("../../lib/prisma.js");
// Flota piloto inicial de Ibarra (fallback en memoria cuando la BD no está conectada)
const DEFAULT_PILOT_FLEET = [
    {
        id: 'truck-ceibos-1',
        licensePlate: 'IAA-1041',
        driverName: 'Carlos Minda',
        helperName: 'Juan Pérez',
        helperPhone: '0991112233',
        status: 'IN_TRANSIT',
        currentStockFull: 28,
        currentStockEmpty: 12,
        lastLatitude: 0.3475,
        lastLongitude: -78.1285,
        zone: 'Los Ceibos / Parque Céntrica',
        updatedAt: new Date(),
    },
    {
        id: 'truck-caranqui-2',
        licensePlate: 'IAA-2052',
        driverName: 'Wilson Imbaquingo',
        helperName: 'Segundo Farinango',
        helperPhone: '0992223344',
        status: 'IDLE',
        currentStockFull: 34,
        currentStockEmpty: 6,
        lastLatitude: 0.3312,
        lastLongitude: -78.1345,
        zone: 'Caranqui / Atahualpa',
        updatedAt: new Date(),
    },
    {
        id: 'truck-centro-3',
        licensePlate: 'IAA-3063',
        driverName: 'Rodrigo Benalcázar',
        helperName: 'Marcelo Ipiales',
        helperPhone: '0993334455',
        status: 'IN_TRANSIT',
        currentStockFull: 14,
        currentStockEmpty: 26,
        lastLatitude: 0.3541,
        lastLongitude: -78.1221,
        zone: 'Centro Histórico / La Merced',
        updatedAt: new Date(),
    },
    {
        id: 'truck-yacucalle-4',
        licensePlate: 'IAA-4074',
        driverName: 'Luis Flores',
        helperName: 'Esteban Morales',
        helperPhone: '0994445566',
        status: 'IDLE',
        currentStockFull: 4, // Alerta stock bajo
        currentStockEmpty: 36,
        lastLatitude: 0.342,
        lastLongitude: -78.1189,
        zone: 'Yacucalle / Terminal Terrestre',
        updatedAt: new Date(),
    },
];
class FleetService {
    trucksMemory = [...DEFAULT_PILOT_FLEET];
    /**
     * Obtiene el listado consolidado de camiones con ubicación y stock desde PostgreSQL DB
     */
    async getFleetStatus() {
        try {
            const dbTrucks = await prisma_js_1.prisma.truck.findMany({
                where: { status: { not: 'OFF_DUTY' } },
                select: {
                    id: true,
                    licensePlate: true,
                    driverName: true,
                    helperName: true,
                    helperPhone: true,
                    status: true,
                    currentStockFull: true,
                    currentStockEmpty: true,
                    lastLatitude: true,
                    lastLongitude: true,
                    updatedAt: true,
                },
            });
            if (dbTrucks && dbTrucks.length > 0) {
                return dbTrucks.map((t) => ({
                    id: t.id,
                    licensePlate: t.licensePlate,
                    driverName: t.driverName,
                    helperName: t.helperName,
                    helperPhone: t.helperPhone,
                    status: t.status || 'IDLE',
                    currentStockFull: t.currentStockFull,
                    currentStockEmpty: t.currentStockEmpty,
                    lastLatitude: Number(t.lastLatitude) || 0.345,
                    lastLongitude: Number(t.lastLongitude) || -78.125,
                    zone: 'Ibarra Sectorizado',
                    updatedAt: t.updatedAt,
                }));
            }
        }
        catch {
            // Usar réplica en memoria en caso de desconexión
        }
        return this.trucksMemory;
    }
    /**
     * Actualiza telemetría de un camión en tiempo real en la BD PostgreSQL
     */
    async updateTruckPosition(truckId, lat, lng) {
        const truck = this.trucksMemory.find((t) => t.id === truckId);
        if (truck) {
            truck.lastLatitude = lat;
            truck.lastLongitude = lng;
            truck.updatedAt = new Date();
        }
        try {
            await prisma_js_1.prisma.truck.update({
                where: { id: truckId },
                data: {
                    lastLatitude: lat,
                    lastLongitude: lng,
                    lastPingAt: new Date(),
                },
            });
            await prisma_js_1.prisma.$executeRawUnsafe(`
        UPDATE trucks 
        SET last_known_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        WHERE id = '${truckId}'
      `);
        }
        catch {
            // Silencioso en modo offline
        }
        return true;
    }
    /**
     * Obtiene eventos de actividad en tiempo real desde la BD (ventas, stock bajo, despachos)
     */
    async getActivityEvents() {
        try {
            const logs = await prisma_js_1.prisma.inventoryLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    truck: true,
                    order: true,
                },
            });
            if (logs && logs.length > 0) {
                return logs.map((log) => {
                    const timeAgo = formatTimeAgo(log.createdAt);
                    const truckPlate = log.truck?.licensePlate || 'Camión';
                    if (log.changeType === 'SALE') {
                        const qty = Math.abs(log.quantityDelta);
                        return {
                            id: log.id,
                            timestamp: timeAgo,
                            type: 'ORDER_DELIVERED',
                            title: `Entrega completada (${qty} ${qty === 1 ? 'cilindro' : 'cilindros'})`,
                            description: `Camión ${truckPlate} registró cobranza de $${(qty * 3.0).toFixed(2)} en efectivo.`,
                            zone: log.order?.addressLandmark || 'Sector Ibarra',
                        };
                    }
                    return {
                        id: log.id,
                        timestamp: timeAgo,
                        type: 'STOCK_LOW',
                        title: `Carga de inventario registrada (${log.quantityDelta} unidades)`,
                        description: `Camión ${truckPlate} actualizó stock resultante a ${log.resultingStock} cilindros.`,
                        zone: 'Bodega / En Ruta',
                    };
                });
            }
        }
        catch {
            // Fallback a eventos semilla
        }
        return [
            {
                id: 'evt-1',
                timestamp: 'Hace 2 min',
                type: 'ORDER_DELIVERED',
                title: 'Entrega completada (1 cilindro doméstico)',
                description: 'Camión IAA-1041 cobró $3.00 en efectivo a cliente en Los Ceibos.',
                zone: 'Los Ceibos',
            },
            {
                id: 'evt-2',
                timestamp: 'Hace 5 min',
                type: 'OFFER_ACCEPTED',
                title: 'Despacho aceptado en cabina',
                description: 'Ayudante Luis Muenala aceptó orden #ord-9231 con desvío vial de 280m.',
                zone: 'Centro Histórico',
            },
            {
                id: 'evt-3',
                timestamp: 'Hace 11 min',
                type: 'STOCK_LOW',
                title: 'Alerta de stock bajo (4 cilindros restantes)',
                description: 'Camión IAA-4074 en Yacucalle necesita programar retorno a bodega.',
                zone: 'Yacucalle',
            },
            {
                id: 'evt-4',
                timestamp: 'Hace 14 min',
                type: 'ORDER_RECEIVED',
                title: 'Nuevo pedido vía WhatsApp',
                description: 'Cliente 0998877661 solicitó 2 cilindros en Caranqui mediante bot interactivo.',
                zone: 'Caranqui',
            },
        ];
    }
    /**
     * Retorna métricas agregadas del día para el distribuidor desde la BD
     */
    async getDashboardMetrics() {
        const trucks = await this.getFleetStatus();
        const totalStockAvailable = trucks.reduce((sum, t) => sum + t.currentStockFull, 0);
        const lowStockAlertsCount = trucks.filter((t) => t.currentStockFull <= 5).length;
        const activeTrucks = trucks.filter((t) => t.status !== 'OFFLINE').length;
        let completedOrdersToday = 48; // Métricas base de simulación
        let totalCollectedToday = completedOrdersToday * 3.0;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dbCount = await prisma_js_1.prisma.order.count({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: today },
                },
            });
            if (dbCount > 0) {
                completedOrdersToday = dbCount;
                totalCollectedToday = dbCount * 3.0;
            }
        }
        catch {
            // Fallback a métricas piloto
        }
        return {
            totalTrucksActive: activeTrucks,
            totalStockAvailable,
            completedOrdersToday,
            totalCollectedToday,
            lowStockAlertsCount,
        };
    }
}
exports.FleetService = FleetService;
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60)
        return 'Hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours} h`;
}
exports.fleetService = new FleetService();
//# sourceMappingURL=fleet.service.js.map