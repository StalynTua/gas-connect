import { z } from 'zod';

/**
 * Método de pago utilizado en la entrega
 */
export const PaymentMethodEnum = z.enum(['CASH', 'TRANSFER']);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

/**
 * Estados del ciclo de vida del pedido
 */
export const OrderStatusEnum = z.enum([
  'PENDING',
  'OFFERED',
  'ASSIGNED',
  'COMPLETED',
  'CANCELLED',
  'SCHEDULED',
  'DELIVERED',
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

/**
 * Petición enviada desde la cabina del camión al completar una entrega
 */
export const CompleteOrderRequestSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
  truckId: z.string().min(1, 'truckId is required'),
  quantityDelivered: z.number().int().positive('quantityDelivered must be positive'),
  paymentMethod: PaymentMethodEnum.default('CASH'),
  amountCollected: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});
export type CompleteOrderRequest = z.infer<typeof CompleteOrderRequestSchema>;

/**
 * Respuesta del backend tras completar y registrar la entrega en base de datos
 */
export const CompleteOrderResponseSchema = z.object({
  success: z.boolean(),
  orderId: z.string(),
  truckId: z.string().optional(),
  status: z.enum(['DELIVERED', 'COMPLETED']).optional().default('DELIVERED'),
  completedAt: z.string().optional(),
  remainingStock: z.number().int().nonnegative().optional(),
  warningLowStock: z.boolean().optional(),
});
export type CompleteOrderResponse = z.infer<typeof CompleteOrderResponseSchema>;
