import { z } from 'zod';
import { CoordinatesSchema } from './coordinates.js';

/**
 * Petición periódica de telemetría enviada desde la cabina del camión (cab-pwa)
 */
export const TelemetryPingRequestSchema = z.object({
  truckId: z.string().min(1, 'truckId is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  currentStock: z.number().int().min(0, 'currentStock must be non-negative'),
  batteryLevel: z.number().min(0).max(100).optional(),
  speed: z.number().min(0).optional(),
  status: z.enum(['IDLE', 'IN_TRANSIT', 'RESTOCKING', 'OFF_DUTY']).optional(),
  timestamp: z.string().optional(),
});
export type TelemetryPingRequest = z.infer<typeof TelemetryPingRequestSchema>;

/**
 * Versión flexible de petición de telemetría que tolera payloads con `lat` y `lng`
 */
export const FlexibleTelemetryPingRequestSchema = z.preprocess((input: unknown) => {
  if (input && typeof input === 'object') {
    const record = { ...(input as Record<string, unknown>) };
    if (record.latitude === undefined && typeof record.lat === 'number') {
      record.latitude = record.lat;
    }
    if (record.longitude === undefined && typeof record.lng === 'number') {
      record.longitude = record.lng;
    }
    return record;
  }
  return input;
}, TelemetryPingRequestSchema);
export type FlexibleTelemetryPingRequest = z.infer<typeof FlexibleTelemetryPingRequestSchema>;

/**
 * Respuesta del servidor ante un ping de telemetría
 * Cumple con PROJECT.md y API actual de Fastify
 */
export const TelemetryResponseSchema = z.object({
  success: z.boolean().default(true),
  status: z.string().optional().default('ok'),
  truckId: z.string().optional(),
  message: z.string().optional(),
  updatedLocation: CoordinatesSchema.optional(),
  timestamp: z.string().optional(),
  receivedAt: z.string().optional(),
});
export type TelemetryResponse = z.infer<typeof TelemetryResponseSchema>;
