import type { FleetTruckSummary } from '../domain/fleet-truck.entity.js';
import type { IFleetRepository } from '../domain/fleet.repository.js';

export class GetFleetStatusUseCase {
  constructor(private readonly fleetRepo: IFleetRepository) {}

  async execute(): Promise<FleetTruckSummary[]> {
    return this.fleetRepo.getFleetStatus();
  }
}
