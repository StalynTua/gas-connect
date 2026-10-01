import { z } from 'zod';
import { CoordinatesSchema } from './coordinates.js';

/**
 * Enums de despacho
 */
export const DispatchDecisionEnum = z.enum(['ACCEPTED', 'REJECTED']);
export type DispatchDecision = z.infer<typeof DispatchDecisionEnum>;

export const DispatchSessionStatusEnum = z.enum([
  'SEARCHING',
  'OFFERED',
  'ASSIGNED',
  'EXPIRED',
  'REJECTED',
  'OFFERING_PARTIAL',
  'NO_TRUCKS_AVAILABLE',
]);
export type DispatchSessionStatus = z.infer<typeof DispatchSessionStatusEnum>;

export const CylinderTypeEnum = z.enum(['DOMESTIC_15KG', 'INDUSTRIAL_45KG']);
export type CylinderType = z.infer<typeof CylinderTypeEnum>;

/**
 * DTO de camión candidato en el algoritmo de despacho
 */
export const CandidateTruckSchema = z.object({
  id: z.string(),
  distributorId: z.string().optional(),
  licensePlate: z.string(),
  driverName: z.string(),
  helperName: z.string(),
  helperPhone: z.string().optional(),
  currentStockFull: z.number().int().nonnegative().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radialDistanceMeters: z.number().nonnegative().optional(),
  roadDistanceMeters: z.number().nonnegative().optional(),
  etaMinutes: z.number().nonnegative().optional(),
});
export type CandidateTruckDto = z.infer<typeof CandidateTruckSchema>;

/**
 * Petición de decisión de despacho enviada por el ayudante desde la PWA de cabina
 */
export const DispatchDecisionRequestSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  truckId: z.string().min(1, 'truckId is required'),
  decision: DispatchDecisionEnum,
  quantity: z.number().int().positive().optional().default(1),
  landmark: z.string().optional(),
  destination: CoordinatesSchema.optional(),
});
export type DispatchDecisionRequest = z.infer<typeof DispatchDecisionRequestSchema>;

/**
 * Respuesta del servidor ante la decisión de despacho
 */
export const DispatchDecisionResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(['ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  sessionStatus: DispatchSessionStatusEnum.optional(),
  orderId: z.string().optional(),
  assignedTruckId: z.string().optional(),
  assignedTruck: CandidateTruckSchema.optional(),
});
export type DispatchDecisionResponse = z.infer<typeof DispatchDecisionResponseSchema>;

/**
 * Oferta de despacho enviada en tiempo real hacia la PWA de cabina
 */
export const ActiveOfferSchema = z.object({
  // Identificador de oferta
  offerId: z.string().optional(),
  dispatchAttemptId: z.string().optional(),
  orderId: z.string().min(1, 'orderId is required'),

  // Temporizador de cascada (45 segundos por defecto tras normalización)
  timeoutSeconds: z.number().int().positive().optional(),
  offerTimeoutSeconds: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),

  // Detalle del producto solicitado
  cylinderType: CylinderTypeEnum.default('DOMESTIC_15KG'),
  quantity: z.number().int().positive().optional(),
  cylindersCount: z.number().int().positive().optional(),
  totalPrice: z.number().positive().optional(),
  hasEmptyCylinders: z.boolean().default(true),

  // Datos del cliente y entrega
  customerPhone: z.string().optional(),
  customerSector: z.string().optional(),
  deliveryAddress: z.string().optional(),
  landmark: z.string().optional(),
  destination: CoordinatesSchema.optional(),

  // Estimaciones viales OSRM
  distanceMeters: z.number().nonnegative().optional(),
  estimatedDetourMeters: z.number().nonnegative().optional(),
  estimatedEtaMinutes: z.number().nonnegative().default(0),
});
export type ActiveOffer = z.infer<typeof ActiveOfferSchema>;

/**
 * Normalizador de ofertas activas para cabStore y Centrifugo
 * Sincroniza nombres canónicos (PROJECT.md) con nombres de cab-pwa (cabStore)
 * Prioriza atributos canónicos para prevenir pérdida de datos o sobrescritura
 * involuntaria con valores por defecto.
 */
export function normalizeActiveOffer(raw: ActiveOffer): ActiveOffer {
  const attemptId = raw.offerId || raw.dispatchAttemptId || `offer-${raw.orderId}`;
  const quantity = raw.cylindersCount ?? raw.quantity ?? 1;
  const timeoutSeconds = raw.offerTimeoutSeconds ?? raw.timeoutSeconds ?? 45;
  const distance = raw.distanceMeters ?? raw.estimatedDetourMeters ?? 0;
  return {
    ...raw,
    offerId: raw.offerId || attemptId,
    dispatchAttemptId: raw.dispatchAttemptId || attemptId,
    quantity,
    cylindersCount: quantity,
    timeoutSeconds,
    offerTimeoutSeconds: timeoutSeconds,
    distanceMeters: raw.distanceMeters ?? distance,
    estimatedDetourMeters: raw.estimatedDetourMeters ?? distance,
  };
}
