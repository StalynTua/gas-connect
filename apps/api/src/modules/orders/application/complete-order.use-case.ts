import type { CompleteOrderParams, CompleteOrderResult, IOrderRepository } from '../domain/order.repository.js';
import type { IFleetRepository } from '../../fleet/domain/fleet.repository.js';
import type { IFleetBroadcaster } from '../../fleet/domain/fleet-broadcaster.port.js';

export class CompleteOrderUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly fleetRepo?: IFleetRepository,
    private readonly broadcaster?: IFleetBroadcaster
  ) {}

  async execute(dto: CompleteOrderParams): Promise<CompleteOrderResult> {
    const result = await this.orderRepo.completeOrder(dto);

    if (this.fleetRepo) {
      await this.fleetRepo.updateTruckStatus(dto.truckId, 'IDLE');
    }

    if (this.broadcaster) {
      await this.broadcaster.publishTruckUpdate({
        truckId: dto.truckId,
        status: 'IDLE',
      });
    }

    return result;
  }
}
