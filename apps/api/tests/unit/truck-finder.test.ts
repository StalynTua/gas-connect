import { describe, it, expect } from 'vitest';
import { TruckFinderService } from '../../src/modules/dispatch/truck-finder.service.js';

describe('Truck Finder Service & Eligibility Filtering', () => {
  const service = new TruckFinderService();

  // Ubicación del cliente en Los Ceibos (Calle Los Sauces)
  const deliveryLocation = { lat: 0.3475, lng: -78.1285 };

  // Camiones de prueba en Ibarra
  const mockTrucks = [
    {
      id: 'truck-1-ceibos',
      licensePlate: 'IAA-1041',
      driverName: 'Carlos Perez',
      helperName: 'Luis Muenala',
      helperPhone: '0998877661',
      currentStockFull: 40,
      status: 'IDLE',
      lat: 0.3480, // A 100m en Los Ceibos
      lng: -78.1280,
    },
    {
      id: 'truck-2-caranqui',
      licensePlate: 'IAB-2082',
      driverName: 'Marco Imbaquingo',
      helperName: 'Jorge Quilumba',
      helperPhone: '0998877662',
      currentStockFull: 25,
      status: 'IDLE',
      lat: 0.3340, // A 1.8km en Caranqui (fuera de radio de 1.5km)
      lng: -78.1250,
    },
    {
      id: 'truck-3-nostock',
      licensePlate: 'IAC-3093',
      driverName: 'Segundo Morales',
      helperName: 'David Cachimuel',
      helperPhone: '0998877663',
      currentStockFull: 1, // Solo 1 bombona
      status: 'IDLE',
      lat: 0.3478, // Muy cerca
      lng: -78.1282,
    },
    {
      id: 'truck-4-offduty',
      licensePlate: 'IAD-4014',
      driverName: 'Wilson Espinoza',
      helperName: 'Andres Farinango',
      helperPhone: '0998877664',
      currentStockFull: 50,
      status: 'OFF_DUTY', // Fuera de turno
      lat: 0.3476,
      lng: -78.1284,
    },
  ];

  it('should filter candidate trucks by radius, stock, and active status', () => {
    // Cliente solicita 2 cilindros
    const candidates = service.filterAndSortInMemory(mockTrucks, deliveryLocation, {
      quantityRequested: 2,
      maxRadiusMeters: 1500,
    });

    // truck-1 cumple (cerca, stock=40, IDLE)
    // truck-2 se descarta (distancia > 1.5km)
    // truck-3 se descarta (stock=1 < 2)
    // truck-4 se descarta (status=OFF_DUTY)
    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('truck-1-ceibos');
    expect(candidates[0].radialDistanceMeters).toBeLessThan(300);
    expect(candidates[0].currentStockFull).toBe(40);
  });

  it('should include truck-3 if customer only requests 1 cylinder', () => {
    const candidates = service.filterAndSortInMemory(mockTrucks, deliveryLocation, {
      quantityRequested: 1,
      maxRadiusMeters: 1500,
    });

    expect(candidates.map((c) => c.id)).toContain('truck-3-nostock');
    expect(candidates.map((c) => c.id)).toContain('truck-1-ceibos');
  });
});
