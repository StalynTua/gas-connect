import { z } from 'zod';
import { LatLngSchema } from './coordinates.js';

/**
 * Estados operativos del camión
 * Soporta tanto los estados estándar del dominio (AVAILABLE, EN_ROUTE, DELIVERING, OFFLINE)
 * como los valores existentes en BD/Prisma (IDLE, IN_TRANSIT, RESTOCKING, OFF_DUTY)
 */
export const TruckStatusEnum = z.enum([
  'AVAILABLE',
  'EN_ROUTE',
  'DELIVERING',
  'OFFLINE',
  'IDLE',
  'IN_TRANSIT',
  'RESTOCKING',
  'OFF_DUTY',
]);
export type TruckStatus = z.infer<typeof TruckStatusEnum>;

export const StandardTruckStatusEnum = z.enum([
  'AVAILABLE',
  'EN_ROUTE',
  'DELIVERING',
  'OFFLINE',
]);
export type StandardTruckStatus = z.infer<typeof StandardTruckStatusEnum>;

export function toStandardTruckStatus(status: TruckStatus | string): StandardTruckStatus {
  switch (status) {
    case 'IDLE':
    case 'AVAILABLE':
      return 'AVAILABLE';
    case 'IN_TRANSIT':
    case 'EN_ROUTE':
      return 'EN_ROUTE';
    case 'RESTOCKING':
    case 'DELIVERING':
      return 'DELIVERING';
    case 'OFF_DUTY':
    case 'OFFLINE':
    default:
      return 'OFFLINE';
  }
}

/**
 * Resumen consolidado del camión para ops-portal y cab-pwa
 * Acepta valores nulos de PostgreSQL/Prisma (.nullable()) y campos omitidos (.optional())
 */
export const FleetTruckSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  licensePlate: z.string(),
  driverName: z.string(),
  helperName: z.string(),
  helperPhone: z.string().nullable().optional(),
  status: TruckStatusEnum,
  currentStock: z.number().int().nonnegative().nullable().optional(),
  currentStockFull: z.number().int().nonnegative().nullable().optional(),
  currentStockEmpty: z.number().int().nonnegative().nullable().optional(),
  lastKnownLocation: LatLngSchema.nullable().optional(),
  lastLatitude: z.number().nullable().optional(),
  lastLongitude: z.number().nullable().optional(),
  zone: z.string().nullable().optional(),
  batteryLevel: z.number().min(0).max(100).nullable().optional(),
  updatedAt: z.union([z.date(), z.string()]).nullable().optional(),
});
export type FleetTruckSummary = z.infer<typeof FleetTruckSummarySchema>;

/**
 * Normaliza un resumen de camión asegurando compatibilidad cruzada entre ops-portal y backend.
 * Transforma valores `null` de la base de datos en `undefined` o valores canónicos garantizados.
 */
export function normalizeFleetTruckSummary(truck: FleetTruckSummary): FleetTruckSummary {
  // Stock garantizado no nulo
  const stock = truck.currentStock ?? truck.currentStockFull ?? 0;

  // Extracción robusta de coordenadas verificando tipos numéricos
  const lat = typeof truck.lastLatitude === 'number'
    ? truck.lastLatitude
    : (truck.lastKnownLocation && typeof truck.lastKnownLocation.lat === 'number'
      ? truck.lastKnownLocation.lat
      : undefined);

  const lng = typeof truck.lastLongitude === 'number'
    ? truck.lastLongitude
    : (truck.lastKnownLocation && typeof truck.lastKnownLocation.lng === 'number'
      ? truck.lastKnownLocation.lng
      : undefined);

  const hasValidCoordinates = typeof lat === 'number' && typeof lng === 'number';

  return {
    ...truck,
    // Nombre garantizado: nombre explícito o placa vehicular
    name: truck.name || truck.licensePlate,
    currentStock: stock,
    currentStockFull: truck.currentStockFull ?? stock,
    currentStockEmpty: truck.currentStockEmpty ?? 0,
    // Coordenadas consistentes o undefined
    lastLatitude: hasValidCoordinates ? lat : undefined,
    lastLongitude: hasValidCoordinates ? lng : undefined,
    lastKnownLocation: hasValidCoordinates ? { lat, lng } : undefined,
    // Conversión sistemática de null a undefined para consumo limpio en frontend/DTO
    zone: truck.zone ?? undefined,
    batteryLevel: truck.batteryLevel ?? undefined,
    updatedAt: truck.updatedAt ?? undefined,
    helperPhone: truck.helperPhone ?? undefined,
  };
}

/**
 * Respuesta del endpoint GET /api/v1/fleet/status
 */
export const FleetStatusResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().int().nonnegative(),
  trucks: z.array(FleetTruckSummarySchema),
});
export type FleetStatusResponse = z.infer<typeof FleetStatusResponseSchema>;

/**
 * Métricas consolidadas del panel de control
 */
export const FleetDashboardMetricsSchema = z.object({
  // Estandarizadas en PROJECT.md
  activeTrucks: z.number().int().nonnegative().optional(),
  ordersToday: z.number().int().nonnegative().optional(),
  deliveredToday: z.number().int().nonnegative().optional(),
  averageDeliveryTimeMinutes: z.number().nonnegative().optional(),

  // Métricas existentes del backend y ops-portal
  totalTrucksActive: z.number().int().nonnegative().optional(),
  totalStockAvailable: z.number().int().nonnegative().optional(),
  completedOrdersToday: z.number().int().nonnegative().optional(),
  totalCollectedToday: z.number().nonnegative().optional(),
  lowStockAlertsCount: z.number().int().nonnegative().optional(),
});
export type FleetDashboardMetrics = z.infer<typeof FleetDashboardMetricsSchema>;

/**
 * Respuesta del endpoint GET /api/v1/fleet/metrics
 */
export const FleetMetricsResponseSchema = z.object({
  success: z.boolean(),
  metrics: FleetDashboardMetricsSchema,
});
export type FleetMetricsResponse = z.infer<typeof FleetMetricsResponseSchema>;

/**
 * Tipos de eventos de actividad en tiempo real
 */
export const ActivityEventTypeEnum = z.enum([
  'DISPATCH_OFFER',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'ORDER_DELIVERED',
  'TRUCK_STATUS_CHANGED',
  'ORDER_RECEIVED',
  'STOCK_LOW',
]);
export type ActivityEventType = z.infer<typeof ActivityEventTypeEnum>;

/**
 * Evento individual de actividad transmitido por Centrifugo o listado por REST
 */
export const ActivityEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  type: ActivityEventTypeEnum,
  description: z.string(),
  title: z.string().optional(),
  truckId: z.string().optional(),
  orderId: z.string().optional(),
  zone: z.string().optional(),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

/**
 * Respuesta del endpoint GET /api/v1/fleet/events
 */
export const FleetEventsResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().int().nonnegative(),
  events: z.array(ActivityEventSchema),
});
export type FleetEventsResponse = z.infer<typeof FleetEventsResponseSchema>;
