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

export class OsrmRoutingService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OSRM_URL || 'http://localhost:5001';
  }

  /**
   * Calcula la distancia y tiempo de conducción real entre dos puntos
   * considerando sentidos de vía de la red vial de Ibarra.
   */
  async calculateRoute(from: Coordinates, to: Coordinates): Promise<RouteResult> {
    const coordinatesString = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${this.baseUrl}/route/v1/driving/${coordinatesString}?overview=false`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2000), // Timeout estricto de 2s
      });

      if (!response.ok) {
        throw new Error(`OSRM HTTP error: ${response.status}`);
      }

      const data = (await response.json()) as {
        code: string;
        routes?: Array<{ distance: number; duration: number }>;
      };

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          distanceMeters: Math.round(route.distance),
          durationSeconds: Math.round(route.duration),
          durationMinutes: Number((route.duration / 60).toFixed(1)),
        };
      }
    } catch {
      // Fallback a estimación vial en Ibarra (velocidad promedio urbana: 25 km/h)
      // con factor de sinuosidad de 1.35x para calles andinas
    }

    // Estimación urbana de fallback
    const directMeters = calculateHaversineDistance(from, to);
    const roadMeters = Math.round(directMeters * 1.35);
    const speedMetersPerSecond = (25 * 1000) / 3600; // 25 km/h
    const estimatedSeconds = Math.round(roadMeters / speedMetersPerSecond);

    return {
      distanceMeters: roadMeters,
      durationSeconds: estimatedSeconds,
      durationMinutes: Number((estimatedSeconds / 60).toFixed(1)),
      isFallbackEstimate: true,
    };
  }

  /**
   * Calcula la matriz de distancias y tiempos desde múltiples orígenes (camiones)
   * hacia un destino único (hogar del cliente) en una sola llamada atómica.
   */
  async calculateTableMatrix(origins: Coordinates[], destination: Coordinates): Promise<RouteResult[]> {
    if (origins.length === 0) return [];

    const allCoords = [...origins, destination];
    const coordsStr = allCoords.map((c) => `${c.lng},${c.lat}`).join(';');
    const destIndex = allCoords.length - 1;
    const originsIndices = origins.map((_, i) => i).join(';');

    const url = `${this.baseUrl}/table/v1/driving/${coordsStr}?sources=${originsIndices}&destinations=${destIndex}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(2500),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          code: string;
          durations?: number[][];
          distances?: number[][];
        };

        if (data.code === 'Ok' && data.durations) {
          return origins.map((_, i) => {
            const durationSec = data.durations ? data.durations[i][0] : 0;
            const distanceM = data.distances ? data.distances[i][0] : durationSec * 7;
            return {
              distanceMeters: Math.round(distanceM),
              durationSeconds: Math.round(durationSec),
              durationMinutes: Number((durationSec / 60).toFixed(1)),
            };
          });
        }
      }
    } catch {
      // Fallback individual si la tabla falla
    }

    // Fallback mapeado
    return Promise.all(origins.map((origin) => this.calculateRoute(origin, destination)));
  }
}

export const routingService = new OsrmRoutingService();
