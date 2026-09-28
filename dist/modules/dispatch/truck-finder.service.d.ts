import { Coordinates } from '../routing/osrm.service.js';
export interface CandidateTruck {
    id: string;
    distributorId?: string;
    licensePlate: string;
    driverName: string;
    helperName: string;
    helperPhone: string;
    currentStockFull: number;
    latitude: number;
    longitude: number;
    radialDistanceMeters: number;
    roadDistanceMeters: number;
    etaMinutes: number;
}
export interface CandidateQueryOptions {
    distributorId?: string;
    quantityRequested: number;
    maxRadiusMeters?: number;
    maxEtaMinutes?: number;
}
export declare class TruckFinderService {
    /**
     * Encuentra camiones candidatos en Ibarra aplicando:
     * 1. Filtro radial PostGIS (< 1.5 km)
     * 2. Filtro de stock suficiente (current_stock >= requested)
     * 3. Filtro de estado ('IDLE', 'IN_TRANSIT') y latido reciente
     * 4. Enriquecimiento con matriz de ruteo OSRM para calcular desvío vial y ETA real
     */
    findCandidates(deliveryLocation: Coordinates, options: CandidateQueryOptions): Promise<CandidateTruck[]>;
    /**
     * Ordena y filtra camiones en memoria (útil para tests unitarios y fallbacks)
     */
    filterAndSortInMemory(trucks: Array<{
        id: string;
        licensePlate: string;
        driverName: string;
        helperName: string;
        helperPhone: string;
        currentStockFull: number;
        status: string;
        lat: number;
        lng: number;
    }>, deliveryLocation: Coordinates, options: CandidateQueryOptions): CandidateTruck[];
}
export declare const truckFinderService: TruckFinderService;
