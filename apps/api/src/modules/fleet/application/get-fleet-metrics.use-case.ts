import type { FleetDashboardMetrics } from '../domain/fleet-metrics.entity.js';
import type { IFleetRepository } from '../domain/fleet.repository.js';

export class GetFleetMetricsUseCase {
  constructor(private readonly fleetRepo: IFleetRepository) {}

  async execute(): Promise<FleetDashboardMetrics> {
    return this.fleetRepo.getDashboardMetrics();
  }
}
