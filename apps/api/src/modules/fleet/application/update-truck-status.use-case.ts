import type { TruckStatus } from '../domain/fleet-truck.entity.js';
import type { IFleetRepository } from '../domain/fleet.repository.js';
import type { IFleetBroadcaster } from '../domain/fleet-broadcaster.port.js';

export interface UpdateTruckStatusDto {
  truckId: string;
  status: TruckStatus;
}

export class UpdateTruckStatusUseCase {
  constructor(
    private readonly fleetRepo: IFleetRepository,
    private readonly broadcaster?: IFleetBroadcaster
  ) {}

  async execute(dto: UpdateTruckStatusDto): Promise<boolean> {
    const success = await this.fleetRepo.updateTruckStatus(dto.truckId, dto.status);
    if (this.broadcaster) {
      await this.broadcaster.publishTruckUpdate({
        truckId: dto.truckId,
        status: dto.status,
      });
    }
    return success;
  }
}
