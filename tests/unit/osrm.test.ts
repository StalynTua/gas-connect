import { describe, it, expect } from 'vitest';
import { OsrmRoutingService, calculateHaversineDistance } from '../../src/modules/routing/osrm.service.js';

describe('OSRM Routing Service & Distance Calculation', () => {
  const service = new OsrmRoutingService(process.env.OSRM_URL || 'http://localhost:5001');

  // Coordenadas reales en Ibarra:
  // Punto A: Parque Pedro Moncayo (Centro)
  const parqueMoncayo = { lat: 0.3517, lng: -78.1223 };
  // Punto B: Los Ceibos (Calle Los Sauces)
  const losCeibos = { lat: 0.3475, lng: -78.1285 };
  // Punto C: Caranqui (Plaza Atahualpa)
  const caranqui = { lat: 0.3340, lng: -78.1250 };

  it('should calculate Haversine distance correctly between Moncayo and Los Ceibos', () => {
    const distanceMeters = calculateHaversineDistance(parqueMoncayo, losCeibos);
    // La distancia radial entre estos dos puntos en Ibarra es de aprox 800 - 950 metros
    expect(distanceMeters).toBeGreaterThan(700);
    expect(distanceMeters).toBeLessThan(1100);
  });

  it('should return routing result with road detour factor on fallback', async () => {
    const result = await service.calculateRoute(parqueMoncayo, losCeibos);

    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThan(0);
    // El desvío estimado en auto debe ser razonable para Ibarra (< 5 minutos)
    expect(result.durationMinutes).toBeLessThan(6);
  });

  it('should calculate table matrix for multiple candidate trucks', async () => {
    const trucks = [parqueMoncayo, caranqui];
    const destination = losCeibos;

    const matrix = await service.calculateTableMatrix(trucks, destination);

    expect(matrix).toHaveLength(2);
    // El camión en Parque Moncayo está más cerca de Los Ceibos que el camión en Caranqui
    expect(matrix[0].distanceMeters).toBeLessThan(matrix[1].distanceMeters);
  });
});
