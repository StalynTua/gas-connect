import type { TruckStatus } from '../domain/fleet-truck.entity.js';
import type { IFleetRepository } from '../domain/fleet.repository.js';
import type { IFleetBroadcaster } from '../domain/fleet-broadcaster.port.js';

export interface UpdateTruckPositionDto {
  truckId: string;
  latitude: number;
  longitude: number;
  currentStock?: number;
  status?: TruckStatus;
}

export class UpdateTruckPositionUseCase {
  constructor(
    private readonly fleetRepo: IFleetRepository,
    private readonly broadcaster?: IFleetBroadcaster
  ) {}

  async execute(dto: UpdateTruckPositionDto): Promise<boolean> {
    const success = await this.fleetRepo.updateTruckPosition(dto.truckId, dto.latitude, dto.longitude, dto.currentStock);
    if (dto.status) {
      await this.fleetRepo.updateTruckStatus(dto.truckId, dto.status);
    }
    if (this.broadcaster) {
      await this.broadcaster.publishTruckUpdate({
        truckId: dto.truckId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        currentStockFull: dto.currentStock,
        status: dto.status,
      });
    }
    return success;
  }
}
