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
