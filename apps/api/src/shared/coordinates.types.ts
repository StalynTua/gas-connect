import {
  Coordinates as CanonicalCoordinates,
  CoordinatesSchema,
  LatLng,
  LatLngSchema,
  toCoordinates,
  toLatLng,
} from '@gasconnect/contracts';

/**
 * Coordenadas geográficas en el dominio Fastify del backend (lat / lng)
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

export type { LatLng, CanonicalCoordinates };
export { CoordinatesSchema, LatLngSchema, toCoordinates, toLatLng };

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  durationMinutes: number;
  isFallbackEstimate?: boolean;
}
