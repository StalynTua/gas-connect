import type { Coordinates } from '../../../shared/coordinates.types.js';

/**
 * Calcula la distancia ortodrómica aproximada (Haversine) como fallback de emergencia
 * si el motor OSRM local no responde.
 */
export function calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLng = (to.lng - from.lng) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.lat * rad) * Math.cos(to.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
