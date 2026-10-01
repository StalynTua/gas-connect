import { z } from 'zod';

/**
 * Coordenadas canónicas en formato geodésico estándar WGS84
 * Usadas por la base de datos PostgreSQL/PostGIS y APIs REST
 */
export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

/**
 * Coordenadas compactas lat/lng
 * Usadas por Leaflet, motores de ruteo vehicular (OSRM) y pines visuales
 */
export const LatLngSchema = z.object({
  lat: z.number().min(-90, 'lat must be between -90 and 90').max(90, 'lat must be between -90 and 90'),
  lng: z.number().min(-180, 'lng must be between -180 and 180').max(180, 'lng must be between -180 and 180'),
});
export type LatLng = z.infer<typeof LatLngSchema>;

/**
 * Esquema normalizador universal: acepta `{ latitude, longitude }` o `{ lat, lng }`
 * y produce `{ latitude, longitude }`
 */
export const NormalizedCoordinatesSchema = z.union([
  CoordinatesSchema,
  LatLngSchema.transform((val) => ({
    latitude: val.lat,
    longitude: val.lng,
  })),
]);
export type NormalizedCoordinates = z.infer<typeof NormalizedCoordinatesSchema>;

/**
 * Esquema normalizador a LatLng: acepta `{ latitude, longitude }` o `{ lat, lng }`
 * y produce `{ lat, lng }`
 */
export const NormalizedLatLngSchema = z.union([
  LatLngSchema,
  CoordinatesSchema.transform((val) => ({
    lat: val.latitude,
    lng: val.longitude,
  })),
]);
export type NormalizedLatLng = z.infer<typeof NormalizedLatLngSchema>;

/**
 * Utilidades de conversión bidireccional inmediata
 */
export function toCoordinates(c: Coordinates | LatLng): Coordinates {
  if ('latitude' in c && 'longitude' in c) {
    return { latitude: c.latitude, longitude: c.longitude };
  }
  return { latitude: (c as LatLng).lat, longitude: (c as LatLng).lng };
}

export function toLatLng(c: Coordinates | LatLng): LatLng {
  if ('lat' in c && 'lng' in c) {
    return { lat: c.lat, lng: c.lng };
  }
  return { lat: (c as Coordinates).latitude, lng: (c as Coordinates).longitude };
}
