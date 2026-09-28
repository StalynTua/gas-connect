export interface Coordinates {
    lat: number;
    lng: number;
}
export interface RouteResult {
    distanceMeters: number;
    durationSeconds: number;
    durationMinutes: number;
    isFallbackEstimate?: boolean;
}
/**
 * Calcula la distancia ortodrómica aproximada (Haversine) como fallback de emergencia
 * si el motor OSRM local no responde.
 */
export declare function calculateHaversineDistance(from: Coordinates, to: Coordinates): number;
export declare class OsrmRoutingService {
    private baseUrl;
    constructor(baseUrl?: string);
    /**
     * Calcula la distancia y tiempo de conducción real entre dos puntos
     * considerando sentidos de vía de la red vial de Ibarra.
     */
    calculateRoute(from: Coordinates, to: Coordinates): Promise<RouteResult>;
    /**
     * Calcula la matriz de distancias y tiempos desde múltiples orígenes (camiones)
     * hacia un destino único (hogar del cliente) en una sola llamada atómica.
     */
    calculateTableMatrix(origins: Coordinates[], destination: Coordinates): Promise<RouteResult[]>;
}
export declare const routingService: OsrmRoutingService;
