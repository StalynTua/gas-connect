import { useState, useEffect, useCallback } from 'react';
import type { TruckPin, ActivityEvent, FleetMetrics } from '../domain/fleet-dashboard.types.js';
import { fleetApiClient } from '../infrastructure/fleet-api.client.js';
import { centrifugoAdapter } from '../infrastructure/centrifugo.adapter.js';

const INITIAL_TRUCKS: TruckPin[] = [
  {
    id: 'truck-ceibos-1',
    licensePlate: 'IAA-1041',
    driverName: 'Carlos Minda',
    helperName: 'Juan Pérez',
    helperPhone: '0991112233',
    status: 'IDLE',
    currentStockFull: 28,
    currentStockEmpty: 12,
    lastLatitude: 0.3475,
    lastLongitude: -78.1285,
    zone: 'Los Ceibos / Parque Céntrica',
  },
  {
    id: 'truck-caranqui-2',
    licensePlate: 'IAA-2052',
    driverName: 'Wilson Imbaquingo',
    helperName: 'Segundo Farinango',
    helperPhone: '0992223344',
    status: 'IDLE',
    currentStockFull: 34,
    currentStockEmpty: 6,
    lastLatitude: 0.3312,
    lastLongitude: -78.1345,
    zone: 'Caranqui / Atahualpa',
  },
  {
    id: 'truck-centro-3',
    licensePlate: 'IAA-3063',
    driverName: 'Rodrigo Benalcázar',
    helperName: 'Marcelo Ipiales',
    helperPhone: '0993334455',
    status: 'IN_TRANSIT',
    currentStockFull: 14,
    currentStockEmpty: 26,
    lastLatitude: 0.3541,
    lastLongitude: -78.1221,
    zone: 'Centro Histórico / La Merced',
  },
  {
    id: 'truck-yacucalle-4',
    licensePlate: 'IAA-4074',
    driverName: 'Luis Flores',
    helperName: 'Esteban Morales',
    helperPhone: '0994445566',
    status: 'IDLE',
    currentStockFull: 4,
    currentStockEmpty: 36,
    lastLatitude: 0.342,
    lastLongitude: -78.1189,
    zone: 'Yacucalle / Terminal Terrestre',
  },
];

const INITIAL_EVENTS: ActivityEvent[] = [
  {
    id: 'evt-1',
    timestamp: 'Hace 2 min',
    type: 'ORDER_DELIVERED',
    title: 'Entrega completada (1 cilindro doméstico)',
    description: 'Camión IAA-1041 cobró $3.00 en efectivo a cliente en Los Ceibos (ref: casa amarilla).',
    zone: 'Los Ceibos',
  },
  {
    id: 'evt-2',
    timestamp: 'Hace 5 min',
    type: 'OFFER_ACCEPTED',
    title: 'Despacho aceptado en cabina',
    description: 'Ayudante Marcelo Ipiales aceptó orden #ord-9231 con desvío vial estimado de 280m.',
    zone: 'Centro Histórico',
  },
  {
    id: 'evt-3',
    timestamp: 'Hace 11 min',
    type: 'STOCK_LOW',
    title: 'Alerta de stock bajo (4 cilindros restantes)',
    description: 'Camión IAA-4074 en Yacucalle necesita programar retorno a bodega para recarga.',
    zone: 'Yacucalle',
  },
  {
    id: 'evt-4',
    timestamp: 'Hace 14 min',
    type: 'ORDER_RECEIVED',
    title: 'Nuevo pedido vía WhatsApp',
    description: 'Cliente 0998877661 solicitó 2 cilindros en Caranqui mediante bot interactivo.',
    zone: 'Caranqui',
  },
];

export function useFleetDashboard() {
  const [trucks, setTrucks] = useState<TruckPin[]>(INITIAL_TRUCKS);
  const [metrics, setMetrics] = useState<FleetMetrics>({
    totalTrucksActive: 4,
    totalStockAvailable: 80,
    completedOrdersToday: 48,
    totalCollectedToday: 144.0,
    lowStockAlertsCount: 1,
  });
  const [events, setEvents] = useState<ActivityEvent[]>(INITIAL_EVENTS);
  const [loading, setLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const refreshSnapshot = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, metricsRes, eventsRes] = await Promise.all([
        fleetApiClient.getFleetStatus(),
        fleetApiClient.getFleetMetrics(),
        fleetApiClient.getFleetEvents(),
      ]);

      if (statusRes.success && statusRes.trucks.length > 0) {
        setTrucks(statusRes.trucks);
      }
      if (metricsRes.success) {
        setMetrics(metricsRes.metrics);
      }
      if (eventsRes.success && eventsRes.events.length > 0) {
        setEvents(eventsRes.events);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Carga inicial del snapshot
    refreshSnapshot();

    // 2. Suscripción en tiempo real vía Centrifugo WebSocket
    const unsubscribe = centrifugoAdapter.connect(
      (_channel, data) => {
        setIsLiveConnected(true);
        if (
          data.type === 'TRUCK_POSITION_UPDATED' ||
          data.type === 'TELEMETRY' ||
          data.type === 'TRUCK_STATUS_UPDATED' ||
          data.status !== undefined
        ) {
          setTrucks((prev) =>
            prev.map((t) =>
              t.id === data.truckId
                ? {
                    ...t,
                    lastLatitude: data.latitude ?? t.lastLatitude,
                    lastLongitude: data.longitude ?? t.lastLongitude,
                    currentStockFull: data.currentStockFull ?? t.currentStockFull,
                    status: data.status ?? t.status,
                  }
                : t
            )
          );
        }

        if (data.type === 'EVENT_CREATED' && data.event) {
          setEvents((prev) => [data.event, ...prev.slice(0, 19)]);
        }

        if (data.type === 'METRICS_UPDATED' && data.metrics) {
          setMetrics(data.metrics);
        }
      },
      (connected) => {
        setIsLiveConnected(connected);
      }
    );

    // 3. Fallback de sincronización periódica (resiliente ante cortes de red)
    const syncTimer = setInterval(() => {
      refreshSnapshot();
    }, 15000);

    return () => {
      clearInterval(syncTimer);
      unsubscribe();
      setIsLiveConnected(false);
    };
  }, [refreshSnapshot]);

  return {
    trucks,
    metrics,
    events,
    loading,
    isLiveConnected,
    refreshSnapshot,
  };
}
