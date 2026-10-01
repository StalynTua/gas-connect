export interface Order {
  id: string;
  customerId: string;
  assignedTruckId?: string;
  cylinderType: string;
  quantityRequested: number;
  quantityDelivered?: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  addressLandmark?: string;
  createdAt: Date;
  fulfilledAt?: Date;
}
