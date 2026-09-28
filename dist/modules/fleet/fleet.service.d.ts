export interface FleetTruckSummary {
    id: string;
    licensePlate: string;
    driverName: string;
    helperName: string;
    helperPhone: string;
    status: 'IDLE' | 'IN_TRANSIT' | 'OFFLINE';
    currentStockFull: number;
    currentStockEmpty: number;
    lastLatitude: number;
    lastLongitude: number;
    zone: string;
    updatedAt: Date;
}
export interface FleetDashboardMetrics {
    totalTrucksActive: number;
    totalStockAvailable: number;
    completedOrdersToday: number;
    totalCollectedToday: number;
    lowStockAlertsCount: number;
}
export declare class FleetService {
    private trucksMemory;
    /**
     * Obtiene el listado consolidado de camiones con ubicación y stock desde PostgreSQL DB
     */
    getFleetStatus(): Promise<FleetTruckSummary[]>;
    /**
     * Actualiza telemetría de un camión en tiempo real en la BD PostgreSQL
     */
    updateTruckPosition(truckId: string, lat: number, lng: number): Promise<boolean>;
    /**
     * Obtiene eventos de actividad en tiempo real desde la BD (ventas, stock bajo, despachos)
     */
    getActivityEvents(): Promise<Array<{
        id: string;
        timestamp: string;
        type: 'ORDER_DELIVERED' | 'OFFER_ACCEPTED' | 'STOCK_LOW' | 'ORDER_RECEIVED';
        title: string;
        description: string;
        zone: string;
    }>>;
    /**
     * Retorna métricas agregadas del día para el distribuidor desde la BD
     */
    getDashboardMetrics(): Promise<FleetDashboardMetrics>;
}
export declare const fleetService: FleetService;
