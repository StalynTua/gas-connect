import type { Order } from './order.entity.js';

export interface CreateOrderParams {
  orderId: string;
  phoneNumber: string;
  customerName?: string;
  cylinderType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  latitude: number;
  longitude: number;
  landmark: string;
  status: string;
  assignedTruckId?: string;
}

export interface CompleteOrderParams {
  orderId: string;
  truckId: string;
  quantityDelivered: number;
  paymentMethod?: 'CASH' | 'TRANSFER';
  amountCollected?: number;
}

export interface CompleteOrderResult {
  success: boolean;
  orderId: string;
  truckId: string;
  status?: 'DELIVERED' | 'COMPLETED';
  completedAt?: string;
  remainingStock: number;
  warningLowStock: boolean;
}

export interface IOrderRepository {
  createOrUpdate(params: CreateOrderParams): Promise<void>;
  completeOrder(params: CompleteOrderParams): Promise<CompleteOrderResult>;
  findById(orderId: string): Promise<Order | null>;
}
