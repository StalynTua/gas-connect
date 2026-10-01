import type { CandidateTruck } from '../../dispatch/domain/candidate-truck.entity.js';
import type { StartDispatchUseCase } from '../../dispatch/application/start-dispatch.use-case.js';
import type { IOrderRepository } from '../../orders/domain/order.repository.js';

export interface SimulateOrderParams {
  phoneNumber?: string;
  customerName?: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  quantity?: number;
  mockCandidates?: CandidateTruck[];
}

export interface SimulatedOrderResult {
  success: boolean;
  order: {
    dispatchAttemptId: string;
    orderId: string;
    timeoutSeconds: number;
    cylinderType: string;
    quantity: number;
    totalPrice: number;
    hasEmptyCylinders: boolean;
    customerSector: string;
    landmark: string;
    estimatedDetourMeters: number;
    estimatedEtaMinutes: number;
    destination: {
      latitude: number;
      longitude: number;
    };
    assignedCandidateTruckId?: string;
  };
}

export class SimulateOrderUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly startDispatchUseCase: StartDispatchUseCase
  ) {}

  async execute(params?: SimulateOrderParams): Promise<SimulatedOrderResult> {
    const phoneNumber = params?.phoneNumber || '593998877661';
    const customerName = params?.customerName || 'María Benalcázar (Los Ceibos)';
    const lat = params?.latitude ?? 0.3475;
    const lng = params?.longitude ?? -78.1285;
    const landmark = params?.landmark || 'Casa esquinera amarilla de 2 pisos, reja negra con flores';
    const quantity = params?.quantity ?? 2;
    const orderId = `ord-${Date.now()}`;
    const totalAmount = quantity * 3.0;

    await this.orderRepo.createOrUpdate({
      orderId,
      phoneNumber,
      customerName,
      cylinderType: 'DOMESTIC_15KG',
      quantity,
      unitPrice: 3.0,
      totalAmount,
      latitude: lat,
      longitude: lng,
      landmark,
      status: 'OFFERED',
    });

    const session = await this.startDispatchUseCase.execute({
      orderId,
      quantityRequested: quantity,
      deliveryLocation: { lat, lng },
      addressLandmark: landmark,
      mockCandidates: params?.mockCandidates,
    });

    const candidate = session.candidates[0];

    return {
      success: true,
      order: {
        dispatchAttemptId: session.currentAttemptId || `attempt-${orderId}-1`,
        orderId,
        timeoutSeconds: 45,
        cylinderType: 'DOMESTIC_15KG',
        quantity,
        totalPrice: totalAmount,
        hasEmptyCylinders: true,
        customerSector: 'Los Ceibos (Calle Los Sauces)',
        landmark,
        estimatedDetourMeters: candidate?.roadDistanceMeters ?? 280,
        estimatedEtaMinutes: candidate?.etaMinutes ?? 2.5,
        destination: {
          latitude: lat,
          longitude: lng,
        },
        assignedCandidateTruckId: candidate?.id,
      },
    };
  }
}
